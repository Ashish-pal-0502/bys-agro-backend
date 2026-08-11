const axios = require("axios")

const sendOTP = async (phone, otp) => {
  try {
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        // route: "otp",
        route: "q",
        // variables_values : otp,
        message: `Hello! Your OTP is ${otp} for logging into Motherland Pure. This code is valid for 5 minutes. Please do not share it with anyone.`,
        numbers: phone,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("SMS Error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendOTP