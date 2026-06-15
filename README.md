# 🚀 Node.js & MongoDB Todo API

A secure, high-performance, and clean-code REST API for managing Todo lists, built as part of my backend development journey.

## ✨ Features
* **Robust Authentication:** Secure login and registration using `bcryptjs` for password hashing.
* **Dual-Token System:** Advanced session security with **Access Tokens** (1m expiry) and **Refresh Tokens** (10m expiry) to maintain user persistence securely.
* **Defensive Middleware:** Centralized `decider` middleware to shield private routes and prevent database overhead.
* **Atomic Database Operations:** Utilizes MongoDB's `$inc` operator for real-time todo counters, ensuring thread safety.
* **Advanced Pagination & Search:** Features regex-based partial search, upper-case injection defense, and automated escape filtering for special letters like `\`.
* **Soft Delete:** Implements safe data practices with a logical `deleted: true` status flag.

## 🛠️ Tech Stack
* **Runtime:** Node.js (ES Modules)
* **Framework:** Express.js
* **Database:** MongoDB (via Mongoose)
* **Security:** JSON Web Tokens (JWT), BcryptJS, Dotenv

## ⚙️ How to run locally
1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Create a `.env` file in the root folder and add your:
   * `accessKey`, `refreshKey`, and database strings.
4. Run `npm start` to fire up the server.
