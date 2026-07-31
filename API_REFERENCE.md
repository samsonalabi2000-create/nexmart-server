# NexMart API Reference

Base URL: `http://localhost:5000/api`

Auth header: `Authorization: Bearer <token>`

---

## AUTH  `/api/auth`

| Method | Endpoint      | Auth | Description         |
|--------|---------------|------|---------------------|
| POST   | /register     | —    | Create account      |
| POST   | /login        | —    | Login               |
| POST   | /logout       | —    | Logout (stateless)  |
| GET    | /me           | ✅   | Get current user    |

### POST /register
```json
{ "name": "John Doe", "email": "john@email.com", "password": "Secret123" }
```
Response: `{ token, user }`

### POST /login
```json
{ "email": "john@email.com", "password": "Secret123" }
```
Response: `{ token, user }`

---

## PROFILE  `/api/profile`  🔒 All require auth

| Method | Endpoint                          | Description               |
|--------|-----------------------------------|---------------------------|
| GET    | /                                 | Get own profile           |
| PUT    | /                                 | Update name/email/phone   |
| PUT    | /avatar                           | Update avatar URL         |
| PUT    | /password                         | Change password           |
| GET    | /addresses                        | List addresses            |
| POST   | /addresses                        | Add address               |
| PUT    | /addresses/:addressId             | Update address            |
| DELETE | /addresses/:addressId             | Delete address            |
| PATCH  | /addresses/:addressId/default     | Set address as default    |

### PUT /profile/password
```json
{ "currentPassword": "OldPass1", "newPassword": "NewPass2" }
```

### POST /profile/addresses
```json
{
  "label": "Home",
  "street": "12 Marina Street",
  "city": "Lagos",
  "state": "Lagos",
  "zip": "100001",
  "isDefault": true
}
```

---

## USERS  `/api/users`  🔒🛡️ Admin only

| Method | Endpoint       | Description        |
|--------|----------------|--------------------|
| GET    | /              | List all users     |
| GET    | /:id           | Get user by ID     |
| PATCH  | /:id/role      | Change user role   |
| DELETE | /:id           | Deactivate user    |

### GET /users?search=&role=&page=&limit=
### PATCH /users/:id/role
```json
{ "role": "admin" }
```

---

## PRODUCTS  `/api/products`

| Method | Endpoint            | Auth | Description              |
|--------|---------------------|------|--------------------------|
| GET    | /                   | —    | List with filters        |
| GET    | /best-sellers       | —    | Best sellers (max 8)     |
| GET    | /new-arrivals       | —    | New arrivals (max 8)     |
| GET    | /flash-sales        | —    | Flash sale items (max 6) |
| GET    | /search?q=          | —    | Quick search (max 8)     |
| GET    | /:id                | —    | Get product + reviews    |
| GET    | /:id/related        | —    | Related products (max 6) |
| POST   | /:id/reviews        | ✅   | Add review               |

### GET /products query params
| Param    | Example          | Description             |
|----------|------------------|-------------------------|
| category | electronics      | Filter by category slug |
| brand    | samsung          | Brand (partial match)   |
| search   | iphone           | Name search             |
| minPrice | 5000             | Min price (₦)           |
| maxPrice | 50000            | Max price (₦)           |
| rating   | 4                | Min rating              |
| sort     | price-asc        | price-asc, price-desc, rating, newest, popular |
| page     | 1                | Page number             |
| limit    | 12               | Items per page          |

Response: `{ products, total, page, totalPages }`

---

## ORDERS  `/api/orders`  🔒 All require auth

| Method | Endpoint | Description         |
|--------|----------|---------------------|
| GET    | /        | My orders (paged)   |
| POST   | /        | Place order         |
| GET    | /:id     | Get order by ID     |

### POST /orders
```json
{
  "items": [
    { "productId": "uuid", "quantity": 2, "image": "https://..." }
  ],
  "shipping": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@email.com",
    "phone": "08012345678",
    "address": "12 Marina Street",
    "city": "Lagos",
    "state": "Lagos",
    "zip": "100001"
  },
  "payment": {
    "method": "card",
    "transactionId": "TXN_xyz"
  },
  "notes": "Leave at gate"
}
```
> **Note:** `subtotal`, `shippingFee`, and `total` are **always calculated server-side**.
> Free delivery applies on orders over ₦50,000.

---

## WISHLIST  `/api/wishlist`  🔒 All require auth

| Method | Endpoint              | Description             |
|--------|-----------------------|-------------------------|
| GET    | /                     | Get wishlist            |
| DELETE | /                     | Clear wishlist          |
| POST   | /:productId           | Add item                |
| DELETE | /:productId           | Remove item             |
| GET    | /:productId/check     | Check if item is in list|

---

## ADMIN  `/api/admin`  🔒🛡️ Admin only

### Products
| Method | Endpoint              | Description         |
|--------|-----------------------|---------------------|
| POST   | /products             | Create product      |
| PUT    | /products/:id         | Update product      |
| DELETE | /products/:id         | Deactivate product  |

### Orders
| Method | Endpoint                  | Description          |
|--------|---------------------------|----------------------|
| GET    | /orders                   | All orders (paged)   |
| GET    | /orders/:id               | Single order         |
| PATCH  | /orders/:id/status        | Update order status  |

### PATCH /admin/orders/:id/status
```json
{
  "status": "shipped",
  "paymentStatus": "paid",
  "transactionId": "TXN_abc123"
}
```

---

## Error Response Format

All errors return:
```json
{ "message": "Human-readable error description" }
```

Validation errors (422) return:
```json
{
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "A valid email is required" }
  ]
}
```

## HTTP Status Codes Used

| Code | Meaning                    |
|------|----------------------------|
| 200  | OK                         |
| 201  | Created                    |
| 400  | Bad request / business rule|
| 401  | Unauthenticated            |
| 403  | Forbidden (wrong role)     |
| 404  | Not found                  |
| 422  | Validation failed          |
| 429  | Rate limit exceeded        |
| 500  | Server error               |
