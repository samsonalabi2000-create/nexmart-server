--
-- PostgreSQL database dump
--

\restrict GpbmLczGjDTcYgcISguyFgk66xoPZRpjQYsNoRta0lbH04jayPuCvz2cqxjdQg0

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED'
);


ALTER TYPE public."OrderStatus" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: seller_application_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.seller_application_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.seller_application_status OWNER TO postgres;

--
-- Name: seller_fulfillment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.seller_fulfillment_status AS ENUM (
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
);


ALTER TYPE public.seller_fulfillment_status OWNER TO postgres;

--
-- Name: seller_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.seller_status AS ENUM (
    'pending',
    'approved',
    'suspended'
);


ALTER TYPE public.seller_status OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AIConversation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AIConversation" (
    id text NOT NULL,
    "userId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AIConversation" OWNER TO postgres;

--
-- Name: AIMessage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AIMessage" (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AIMessage" OWNER TO postgres;

--
-- Name: Address; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Address" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "fullName" text NOT NULL,
    phone text NOT NULL,
    line1 text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Address" OWNER TO postgres;

--
-- Name: Banner; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Banner" (
    id text NOT NULL,
    title text NOT NULL,
    subtitle text,
    "imageUrl" text NOT NULL,
    link text,
    "position" integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public."Banner" OWNER TO postgres;

--
-- Name: Brand; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Brand" (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Brand" OWNER TO postgres;

--
-- Name: Cart; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Cart" (
    id text NOT NULL,
    "userId" text NOT NULL
);


ALTER TABLE public."Cart" OWNER TO postgres;

--
-- Name: CartItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CartItem" (
    id text NOT NULL,
    "cartId" text NOT NULL,
    "productId" text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL
);


ALTER TABLE public."CartItem" OWNER TO postgres;

--
-- Name: Category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Category" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "imageUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Category" OWNER TO postgres;

--
-- Name: Coupon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Coupon" (
    id text NOT NULL,
    code text NOT NULL,
    "percentOff" integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Coupon" OWNER TO postgres;

--
-- Name: Order; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "orderNumber" text NOT NULL,
    "userId" text NOT NULL,
    subtotal double precision NOT NULL,
    "shippingFee" double precision DEFAULT 0 NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    total double precision NOT NULL,
    status public."OrderStatus" DEFAULT 'PENDING'::public."OrderStatus" NOT NULL,
    "shippingName" text NOT NULL,
    "shippingPhone" text NOT NULL,
    "shippingLine1" text NOT NULL,
    "shippingCity" text NOT NULL,
    "shippingState" text NOT NULL,
    "couponCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Order" OWNER TO postgres;

--
-- Name: OrderItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text NOT NULL,
    name text NOT NULL,
    price double precision NOT NULL,
    quantity integer NOT NULL
);


ALTER TABLE public."OrderItem" OWNER TO postgres;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text NOT NULL,
    price double precision NOT NULL,
    "compareAtPrice" double precision,
    stock integer DEFAULT 0 NOT NULL,
    sku text,
    rating double precision DEFAULT 0 NOT NULL,
    "reviewCount" integer DEFAULT 0 NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isFlashSale" boolean DEFAULT false NOT NULL,
    "flashSaleEnd" timestamp(3) without time zone,
    "categoryId" text NOT NULL,
    "brandId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Product" OWNER TO postgres;

--
-- Name: ProductImage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProductImage" (
    id text NOT NULL,
    url text NOT NULL,
    "productId" text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."ProductImage" OWNER TO postgres;

--
-- Name: Review; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Review" (
    id text NOT NULL,
    rating integer NOT NULL,
    comment text NOT NULL,
    "productId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Review" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    phone text,
    "avatarUrl" text,
    "refreshToken" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: Wishlist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Wishlist" (
    id text NOT NULL,
    "userId" text NOT NULL
);


ALTER TABLE public."Wishlist" OWNER TO postgres;

--
-- Name: WishlistItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."WishlistItem" (
    id text NOT NULL,
    "wishlistId" text NOT NULL,
    "productId" text NOT NULL
);


ALTER TABLE public."WishlistItem" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    image_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    name text NOT NULL,
    price numeric(12,2) NOT NULL,
    quantity integer NOT NULL,
    image text,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    shipping_first_name text NOT NULL,
    shipping_last_name text NOT NULL,
    shipping_email text NOT NULL,
    shipping_phone text NOT NULL,
    shipping_address text NOT NULL,
    shipping_city text NOT NULL,
    shipping_state text NOT NULL,
    shipping_zip text DEFAULT ''::text NOT NULL,
    payment_method text DEFAULT 'card'::text NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    transaction_id text,
    subtotal numeric(12,2) NOT NULL,
    shipping_fee numeric(12,2) DEFAULT 0 NOT NULL,
    tax numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) NOT NULL,
    status text DEFAULT 'processing'::text NOT NULL,
    tracking_number text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_payment_method_check CHECK ((payment_method = ANY (ARRAY['card'::text, 'transfer'::text, 'crypto'::text]))),
    CONSTRAINT orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text])))
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    price numeric(12,2) NOT NULL,
    original_price numeric(12,2),
    category text NOT NULL,
    category_name text NOT NULL,
    brand text NOT NULL,
    images text[] DEFAULT '{}'::text[] NOT NULL,
    badge text,
    is_new boolean DEFAULT false NOT NULL,
    is_best_seller boolean DEFAULT false NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    specs jsonb DEFAULT '{}'::jsonb NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    rating numeric(3,2) DEFAULT 0 NOT NULL,
    review_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    videos text[],
    seller_id uuid,
    CONSTRAINT products_badge_check CHECK ((badge = ANY (ARRAY['sale'::text, 'new'::text, 'hot'::text]))),
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_stock_check CHECK ((stock >= 0))
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_name text NOT NULL,
    rating integer NOT NULL,
    comment text NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: seller_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seller_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    store_name text NOT NULL,
    store_slug text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    business_email text DEFAULT ''::text NOT NULL,
    address text DEFAULT ''::text NOT NULL,
    city text DEFAULT ''::text NOT NULL,
    state text DEFAULT ''::text NOT NULL,
    country text DEFAULT 'Nigeria'::text NOT NULL,
    status public.seller_application_status DEFAULT 'pending'::public.seller_application_status NOT NULL,
    rejection_reason text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.seller_applications OWNER TO postgres;

--
-- Name: seller_order_fulfillments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seller_order_fulfillments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    order_id uuid NOT NULL,
    status public.seller_fulfillment_status DEFAULT 'pending'::public.seller_fulfillment_status NOT NULL,
    tracking_number text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.seller_order_fulfillments OWNER TO postgres;

--
-- Name: seller_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seller_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    store_name text NOT NULL,
    store_slug text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    business_email text DEFAULT ''::text NOT NULL,
    address text DEFAULT ''::text NOT NULL,
    city text DEFAULT ''::text NOT NULL,
    state text DEFAULT ''::text NOT NULL,
    country text DEFAULT 'Nigeria'::text NOT NULL,
    status public.seller_status DEFAULT 'pending'::public.seller_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.seller_profiles OWNER TO postgres;

--
-- Name: user_addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    label text DEFAULT 'Home'::text NOT NULL,
    street text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zip text DEFAULT ''::text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_addresses OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    avatar text DEFAULT ''::text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    loyalty_points integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: wishlist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wishlist (
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wishlist OWNER TO postgres;

--
-- Name: AIConversation AIConversation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AIConversation"
    ADD CONSTRAINT "AIConversation_pkey" PRIMARY KEY (id);


--
-- Name: AIMessage AIMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AIMessage"
    ADD CONSTRAINT "AIMessage_pkey" PRIMARY KEY (id);


--
-- Name: Address Address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_pkey" PRIMARY KEY (id);


--
-- Name: Banner Banner_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Banner"
    ADD CONSTRAINT "Banner_pkey" PRIMARY KEY (id);


--
-- Name: Brand Brand_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Brand"
    ADD CONSTRAINT "Brand_pkey" PRIMARY KEY (id);


--
-- Name: CartItem CartItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CartItem"
    ADD CONSTRAINT "CartItem_pkey" PRIMARY KEY (id);


--
-- Name: Cart Cart_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Cart"
    ADD CONSTRAINT "Cart_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: Coupon Coupon_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Coupon"
    ADD CONSTRAINT "Coupon_pkey" PRIMARY KEY (id);


--
-- Name: OrderItem OrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: ProductImage ProductImage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Review Review_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WishlistItem WishlistItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."WishlistItem"
    ADD CONSTRAINT "WishlistItem_pkey" PRIMARY KEY (id);


--
-- Name: Wishlist Wishlist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Wishlist"
    ADD CONSTRAINT "Wishlist_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: orders orders_tracking_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_tracking_number_key UNIQUE (tracking_number);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_product_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_user_id_key UNIQUE (product_id, user_id);


--
-- Name: seller_applications seller_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_applications
    ADD CONSTRAINT seller_applications_pkey PRIMARY KEY (id);


--
-- Name: seller_order_fulfillments seller_order_fulfillments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_order_fulfillments
    ADD CONSTRAINT seller_order_fulfillments_pkey PRIMARY KEY (id);


--
-- Name: seller_order_fulfillments seller_order_fulfillments_seller_id_order_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_order_fulfillments
    ADD CONSTRAINT seller_order_fulfillments_seller_id_order_id_key UNIQUE (seller_id, order_id);


--
-- Name: seller_profiles seller_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_profiles
    ADD CONSTRAINT seller_profiles_pkey PRIMARY KEY (id);


--
-- Name: seller_profiles seller_profiles_store_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_profiles
    ADD CONSTRAINT seller_profiles_store_slug_key UNIQUE (store_slug);


--
-- Name: seller_profiles seller_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_profiles
    ADD CONSTRAINT seller_profiles_user_id_key UNIQUE (user_id);


--
-- Name: user_addresses user_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wishlist wishlist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_pkey PRIMARY KEY (user_id, product_id);


--
-- Name: Brand_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Brand_name_key" ON public."Brand" USING btree (name);


--
-- Name: CartItem_cartId_productId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "CartItem_cartId_productId_key" ON public."CartItem" USING btree ("cartId", "productId");


--
-- Name: Cart_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Cart_userId_key" ON public."Cart" USING btree ("userId");


--
-- Name: Category_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Category_slug_key" ON public."Category" USING btree (slug);


--
-- Name: Coupon_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Coupon_code_key" ON public."Coupon" USING btree (code);


--
-- Name: Order_orderNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Order_orderNumber_key" ON public."Order" USING btree ("orderNumber");


--
-- Name: Product_sku_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Product_sku_key" ON public."Product" USING btree (sku);


--
-- Name: Product_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Product_slug_key" ON public."Product" USING btree (slug);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: WishlistItem_wishlistId_productId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "WishlistItem_wishlistId_productId_key" ON public."WishlistItem" USING btree ("wishlistId", "productId");


--
-- Name: Wishlist_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Wishlist_userId_key" ON public."Wishlist" USING btree ("userId");


--
-- Name: idx_addresses_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_addresses_user ON public.user_addresses USING btree (user_id);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_user ON public.orders USING btree (user_id);


--
-- Name: idx_products_brand; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_brand ON public.products USING btree (brand);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category ON public.products USING btree (category);


--
-- Name: idx_products_name_fts; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_name_fts ON public.products USING gin (to_tsvector('english'::regconfig, name));


--
-- Name: idx_products_seller_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_seller_id ON public.products USING btree (seller_id);


--
-- Name: idx_reviews_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_product ON public.reviews USING btree (product_id);


--
-- Name: idx_seller_applications_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seller_applications_status ON public.seller_applications USING btree (status);


--
-- Name: idx_seller_fulfillments_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seller_fulfillments_order ON public.seller_order_fulfillments USING btree (order_id);


--
-- Name: idx_seller_fulfillments_seller; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seller_fulfillments_seller ON public.seller_order_fulfillments USING btree (seller_id);


--
-- Name: idx_seller_profiles_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seller_profiles_status ON public.seller_profiles USING btree (status);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: uq_seller_applications_pending_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_seller_applications_pending_user ON public.seller_applications USING btree (user_id) WHERE (status = 'pending'::public.seller_application_status);


--
-- Name: orders trg_orders_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: products trg_products_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: AIConversation AIConversation_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AIConversation"
    ADD CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AIMessage AIMessage_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AIMessage"
    ADD CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public."AIConversation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Address Address_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CartItem CartItem_cartId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CartItem"
    ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES public."Cart"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CartItem CartItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CartItem"
    ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Cart Cart_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Cart"
    ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderItem OrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderItem OrderItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductImage ProductImage_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Product Product_brandId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES public."Brand"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Product Product_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Review Review_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Review Review_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WishlistItem WishlistItem_wishlistId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."WishlistItem"
    ADD CONSTRAINT "WishlistItem_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES public."Wishlist"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Wishlist Wishlist_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Wishlist"
    ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: products products_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.seller_profiles(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: seller_applications seller_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_applications
    ADD CONSTRAINT seller_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: seller_applications seller_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_applications
    ADD CONSTRAINT seller_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: seller_order_fulfillments seller_order_fulfillments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_order_fulfillments
    ADD CONSTRAINT seller_order_fulfillments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: seller_order_fulfillments seller_order_fulfillments_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_order_fulfillments
    ADD CONSTRAINT seller_order_fulfillments_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.seller_profiles(id) ON DELETE CASCADE;


--
-- Name: seller_profiles seller_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_profiles
    ADD CONSTRAINT seller_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_addresses user_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wishlist wishlist_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: wishlist wishlist_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict GpbmLczGjDTcYgcISguyFgk66xoPZRpjQYsNoRta0lbH04jayPuCvz2cqxjdQg0

