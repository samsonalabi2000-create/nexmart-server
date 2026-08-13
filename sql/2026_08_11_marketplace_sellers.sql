-- NexMart Marketplace Seller System
-- Run against the existing nexmart database AFTER backing it up.
-- This intentionally does NOT change users.role, so existing 'user'/'admin' auth remains compatible.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'seller_application_status'
  ) THEN
    CREATE TYPE seller_application_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'seller_status'
  ) THEN
    CREATE TYPE seller_status AS ENUM ('pending', 'approved', 'suspended');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'seller_fulfillment_status'
  ) THEN
    CREATE TYPE seller_fulfillment_status AS ENUM (
      'pending', 'processing', 'shipped', 'delivered', 'cancelled'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS seller_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  business_email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'Nigeria',
  status seller_application_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_seller_applications_pending_user
  ON seller_applications(user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_seller_applications_status
  ON seller_applications(status);

CREATE TABLE IF NOT EXISTS seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  business_email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'Nigeria',
  status seller_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_profiles_status
  ON seller_profiles(status);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES seller_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_seller_id
  ON products(seller_id);

CREATE TABLE IF NOT EXISTS seller_order_fulfillments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status seller_fulfillment_status NOT NULL DEFAULT 'pending',
  tracking_number TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(seller_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_fulfillments_seller
  ON seller_order_fulfillments(seller_id);

CREATE INDEX IF NOT EXISTS idx_seller_fulfillments_order
  ON seller_order_fulfillments(order_id);

-- Existing catalog remains platform-owned because seller_id is NULL.
-- Seller-created products will carry seller_id automatically from the authenticated seller.
