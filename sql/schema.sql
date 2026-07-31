-- ============================================================
--  NexMart — PostgreSQL Schema
--  Run once:   -U postgres -d nexmart -f sql/schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- provides gen_random_uuid()

-- ─────────────────────────────────────────────────────────────────────────────
--  USERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  email          TEXT        NOT NULL UNIQUE,
  password       TEXT        NOT NULL,
  phone          TEXT        NOT NULL DEFAULT '',
  avatar         TEXT        NOT NULL DEFAULT '',
  role           TEXT        NOT NULL DEFAULT 'user'
                             CHECK (role IN ('user', 'admin')),
  loyalty_points INTEGER     NOT NULL DEFAULT 0,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─────────────────────────────────────────────────────────────────────────────
--  USER ADDRESSES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_addresses (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label      TEXT        NOT NULL DEFAULT 'Home',
  street     TEXT        NOT NULL,
  city       TEXT        NOT NULL,
  state      TEXT        NOT NULL,
  zip        TEXT        NOT NULL DEFAULT '',
  is_default BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON user_addresses(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
--  PRODUCTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT          NOT NULL,
  description    TEXT          NOT NULL,
  price          NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  original_price NUMERIC(12,2),
  category       TEXT          NOT NULL,
  category_name  TEXT          NOT NULL,
  brand          TEXT          NOT NULL,
  images         TEXT[]        NOT NULL DEFAULT '{}',
  badge          TEXT          CHECK (badge IN ('sale', 'new', 'hot')),
  is_new         BOOLEAN       NOT NULL DEFAULT FALSE,
  is_best_seller BOOLEAN       NOT NULL DEFAULT FALSE,
  stock          INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  specs          JSONB         NOT NULL DEFAULT '{}',
  tags           TEXT[]        NOT NULL DEFAULT '{}',
  rating         NUMERIC(3,2)  NOT NULL DEFAULT 0,
  review_count   INTEGER       NOT NULL DEFAULT 0,
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand    ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_name_fts ON products
  USING gin(to_tsvector('english', name));

-- ─────────────────────────────────────────────────────────────────────────────
--  REVIEWS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  user_name  TEXT        NOT NULL,
  rating     INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT        NOT NULL,
  verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- ─────────────────────────────────────────────────────────────────────────────
--  WISHLIST
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist (
  user_id    UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
--  ORDERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- Shipping snapshot (stored as strings so it survives address edits)
  shipping_first_name TEXT          NOT NULL,
  shipping_last_name  TEXT          NOT NULL,
  shipping_email      TEXT          NOT NULL,
  shipping_phone      TEXT          NOT NULL,
  shipping_address    TEXT          NOT NULL,
  shipping_city       TEXT          NOT NULL,
  shipping_state      TEXT          NOT NULL,
  shipping_zip        TEXT          NOT NULL DEFAULT '',
  -- Payment
  payment_method      TEXT          NOT NULL DEFAULT 'card'
                                    CHECK (payment_method IN ('card', 'transfer', 'crypto')),
  payment_status      TEXT          NOT NULL DEFAULT 'pending'
                                    CHECK (payment_status IN ('pending', 'paid', 'failed')),
  transaction_id      TEXT,
  -- Totals — always computed server-side
  subtotal            NUMERIC(12,2) NOT NULL,
  shipping_fee        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  total               NUMERIC(12,2) NOT NULL,
  -- Fulfilment
  status              TEXT          NOT NULL DEFAULT 'processing'
                                    CHECK (status IN ('processing','shipped','delivered','cancelled')),
  tracking_number     TEXT          UNIQUE,
  notes               TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ─────────────────────────────────────────────────────────────────────────────
--  ORDER ITEMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID          NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
  product_id UUID          REFERENCES products(id)          ON DELETE SET NULL,
  name       TEXT          NOT NULL,
  price      NUMERIC(12,2) NOT NULL,
  quantity   INTEGER       NOT NULL CHECK (quantity > 0),
  image      TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ─────────────────────────────────────────────────────────────────────────────
--  AUTO updated_at TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

SELECT current_database();

SELECT version();



