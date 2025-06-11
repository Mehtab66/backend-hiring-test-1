"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Load environment variables from .env file
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json()); // Middleware to parse JSON bodies
app.use(express_1.default.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies (Twilio sends this)
// Simple root route for testing
app.get('/', (req, res) => {
    res.send('IVR Server is running!');
});
// Global error handler (basic)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
