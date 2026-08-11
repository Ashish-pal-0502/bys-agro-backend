const axios = require("axios");

let cachedToken = null;
let tokenExpiry = null;

async function getShiprocketToken() {
  if (cachedToken && tokenExpiry > Date.now()) {
    return cachedToken;
  }

  const response = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/auth/login",
    {
      email: process.env.SHIPROCKET_API_EMAIL,   
      password: process.env.SHIPROCKET_API_PASS  
    }
  );

  cachedToken = response.data.token;
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; 

  return cachedToken;
}

module.exports = { getShiprocketToken };
