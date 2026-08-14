# 🚀 `csrf-shield` - CSRF Protection Middleware

`csrf-shield` is a middleware for protecting web applications from Cross-Site Request Forgery (CSRF) attacks. It integrates easily with Express.js and ensures that your forms and requests are secure.

## 📦 Installation

Install `csrf-shield` via npm or Yarn.

### NPM

```bash
npm install csrf-shield
```

### Yarn

```bash
yarn add csrf-shield
```

## 🛠️ Usage

### Basic Setup

Here’s a step-by-step guide on how to set up `csrf-shield` in an Express.js application:

1. **Create a basic Express.js application.**

2. **Integrate `csrf-shield` middleware for CSRF protection.**

3. **Use the CSRF token in your forms and validate it on the server side.**

### Example Code

Below is a complete example of how to use `csrf-shield` with an Express.js application:

```javascript
const express = require('express');
const csrfProtection = require('csrf-shield')({
    secret: 'your_secret_key', // Optional: Set a custom secret key for encryption
    timeout: 1000 * 60 * 10, // Optional: Set token validity period (10 minutes)
});
const bodyParser = require('body-parser');

const app = express();

// Use body-parser middleware to parse form and JSON data
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Use CSRF protection middleware
app.use(csrfProtection.middleware);

app.get('/', (req, res) => {
    res.send(`
        <form method="post" action="/login">
            <input type="text" name="username" />
            <input type="password" name="password" />
            <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
            <button type="submit">Login</button>
        </form>
    `);
});

app.post('/login', csrfProtection.verifyToken(), (req, res) => {
    res.send('Logged in');
});

app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
```

### Key Points:

- **`secret`**: (Optional) The secret key used for encrypting and decrypting CSRF tokens. It's recommended to set a custom, secure key. If not provided, a random key will be generated automatically.
- **`timeout`**: (Optional) The validity period of tokens in milliseconds. Default is 10 minutes. Adjust this value according to your application's security needs.

### Generating CSRF Tokens

To generate CSRF tokens, use the following method:

```javascript
app.use((req, res, next) => {
    req.csrfToken = () => {
        const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;
        const userAgent = req.headers['user-agent'];
        return csrfProtection.generateToken(ip, userAgent);
    };
    next();
});
```

### Token Verification

Use the `verifyToken` middleware to verify tokens in your routes:

```javascript
app.post('/login', csrfProtection.verifyToken(), (req, res) => {
    res.send('Logged in');
});
```

## 🔍 Features

- **Automatic Token Generation**: Generates a CSRF token for each request.
- **Token Verification**: Validates tokens in requests and checks their validity.
- **Customizable**: Set your own secret key and token validity period.

## ⚠️ Why Use This?

CSRF attacks exploit the trust a web application has in the user's browser. `csrf-shield` helps prevent these attacks by ensuring that every request with sensitive actions is accompanied by a valid CSRF token.

## 📄 API Reference

### `csrfShield(options)`

- **options.secret**: (Optional) The secret key used for encrypting tokens. A random key is used by default if not specified.
- **options.timeout**: (Optional) The validity period of tokens in milliseconds. Default is 10 minutes.

### `middleware(req, res, next)`

- **req.csrfToken()**: Generates a new CSRF token to be used in forms.

### `verifyToken()`

- **req.body._csrf**: (Optional) Token location in form data.
- **req.query._csrf**: (Optional) Token location in query parameters.
- **req.headers['x-csrf-token']**: (Optional) Token location in HTTP headers.

## 🛠️ Support & Contributing

For issues or contributions, please visit the [GitHub repository](https://github.com/fastuptime/csrf-shield).

## 📝 License

This project is licensed under the [MIT License](LICENSE.md).
