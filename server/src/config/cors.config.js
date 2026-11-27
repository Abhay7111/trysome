const defaultOrigins = [
    'http://localhost:5173',
    'https://t11ms8fb-5173.inc1.devtunnels.ms',
    'https://abhay7111-tweeter.netlify.app',
    'https://abhay7111-api-testing.netlify.app'
];
const configuredOrigins = (process.env.CLIENT_URL ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);

function corsOrigin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
}

module.exports = corsOrigin;
