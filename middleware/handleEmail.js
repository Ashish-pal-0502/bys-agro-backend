const nodemailer = require('nodemailer')
const asyncHandler = require('express-async-handler')
const dotenv = require('dotenv')
const { S3Client } = require("@aws-sdk/client-s3");
const { S3 } = require("@aws-sdk/client-s3");
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const abandonedCartTemplate = require('../services/emailTemplates/abandonedCartTemplate.js');
const axios = require('axios');
const {
  supportTransporter,
  orderTransporter,
  cartTransporter,
  verifyTransporter,
  helpTransporter
} = require('./helperTransporter')

const config = {
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
};

const s3 = new S3Client(config);

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   host: "smtp.gmail.com",
//   port: 465, 
//   secure: true, 
//   auth: {
//     user: process.env.USER_EMAIL,
//     pass: process.env.USER_PASS,
//   },
// });

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: 587,
//   secure: false,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });



// const verifyTransporter = asyncHandler(async (req, res, next) => {
//   try {
//     await transporter.verify();

//     next();  
//   } catch (error) {
//     console.log(error)
//     throw new Error('Email transporter verification failed');
//   }
// });


const sendResetEmail = asyncHandler(async (email, otp) => {
  try {
    const info = await supportTransporter.sendMail({
      from: `Motherland Pure ${process.env.SUPPORT_EMAIL}`,
      to: email,
      subject: `Your Temporary Password`,
      subject: `Your One-Time Password (OTP) for Login`,
      text: `
    Hello,
    
    We’ve generated a One-Time Password (OTP) for your account to help you log in securely.
    
    Your OTP/Temporary Password is: ${otp}
    
    Please note:
      • This OTP is valid only for one-time use.
      • Keep it confidential and do not share it with anyone.
      • Once you’ve logged in, we recommend changing your password to ensure your account’s security.
      • If you didn’t request this OTP, please contact us immediately.
    
    We’re here to assist if you have any questions or need help.
    
    Warm Regards,  
    Motherland Pure   
    www.motherlandpure.com  
    support@motherlandpure.com  
    
        `,
    });
    return true
  } catch (e) {
    console.error(e);
    return false
  }
})


const sendVerificationEmail = asyncHandler(async (otp, email) => {
  try {
    const info = await supportTransporter.sendMail({
      from: `Motherland Pure ${process.env.SUPPORT_EMAIL}`,
      to: email,
      subject: `Verify Your Email Address - Motherland Pure`,
      text: `
Hello,

Thank you for signing up with Motherland! To complete the verification of your email address, please use the One-Time Password (OTP) provided below.

Your OTP/Verification Code is: ${otp}

Please note:
  • This OTP is valid only for one-time use.
  • Keep it confidential and do not share it with anyone.
  • Once verified, you’ll gain full access to your account.

If you didn’t sign up for Motherland, please disregard this email or contact us immediately.

We’re here to assist if you have any questions or need help.

Warm Regards,  
Team MotherlandPure.com  
www.motherlandpure.com  
support@motherlandpure.com  

        `,
    });
    return true;
  } catch (e) {
    console.error(e);
    return false
  }

});

const sendApprovalEmail = asyncHandler(async (email, name) => {
  try {
    await supportTransporter.sendMail({
      from: `Motherland Pure ${process.env.SUPPORT_EMAIL}`,
      to: email,
      subject: `Your Profile Has Been Approved`,
      text: `
Hello ${name},

Good news! 🎉 Your profile has been reviewed and approved by our admin team.  
You can now log in and start using your account.

We’re excited to have you onboard as part of Doera!

Warm Regards,  
Motherland Pure  
www.motherlandpure.com  
support@motherlandpure.com  

    `,
    });
    return true
  } catch (e) {
    console.error(e);
    return false
  }
});

const sendRejectionEmail = asyncHandler(async (email, name, reason) => {
  try {
    await supportTransporter.sendMail({
      from: `Motherland Pure ${process.env.SUPPORT_EMAIL}`,
      to: email,
      subject: `Your Profile Has Been Rejected`,
      text: `
Hello ${name},

Unfortunately, your profile has been rejected after review.  

Please contact our support team and make the required changes before re-submitting your profile.  
We’re here to help you through the process.

Warm Regards,  
Motherland Pure  
www.motherlandpure.com  
support@motherlandpure.com  

    `,
    });

    return true
  } catch (e) {
    console.error(e);
    return false
  }

});

const sendAbandonedCartEmail = asyncHandler(async (email, firstName, products) => {
  try {
    const nameToUse = firstName || "Customer";
    console.log("products", products)
    const html = abandonedCartTemplate(nameToUse, products);
    console.log(email, nameToUse);
    console.log("process.env.CART_EMAIL", process.env.CART_EMAIL, "process.env.CART_PASS", process.env.CART_PASS)
    const info = await cartTransporter.sendMail({
      from: `Motherland Pure <${process.env.CART_EMAIL}>`,
      to: email,
      subject: `You left something in your cart 🛒`,
      text: `Hi ${nameToUse}, you left items in your cart. Complete your order now.`,
      html
    });
    console.log("info", info)
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
});


const sendBulkEmail = asyncHandler(
  async ({ subject, html, emails }) => {
    try {
      const info = await supportTransporter.sendMail({
        from: `Motherland Pure <${process.env.SUPPORT_EMAIL}>`,
        to: emails,
        subject,
        html,
      });

      return true;
    } catch (error) {
      console.error("Email error:", error);
      return false;
    }
  }
);


// const sendOrderConfirmationEmail = asyncHandler(async ({
//   userName,
//   email,
//   orderItems,
//   orderId,
//   totalPrice
// }) => {
//   try {
//     const itemsText = orderItems
//       .map(
//         (item, index) =>
//           `${index + 1}. ${item.name} × ${item.qty}`
//       )
//       .join("\n");

//       console.log('order verification email is running', {
//           userName,
//           email,
//           orderItems,
//           orderId,
//           totalPrice
//       })

//     const info = await orderTransporter.sendMail({
//       from: `Motherland Pure ${process.env.ORDER_EMAIL}`,
//       to: email,
//       subject: "Order Confirmation - Motherland Pure",
//       text: `
// Hello ${userName},

// Thank you for your order with Motherland Pure! 🌿  
// Your order has been successfully placed.

// Order Details:
// ------------------------
// Order ID: ${orderId || "N/A"}

// Items Ordered:
// ${itemsText}

// ------------------------
// Total Amount: ₹${totalPrice || "N/A"}

// What happens next?
// • We are processing your order.

// If you have any questions or need help, feel free to reach out to us.

// Warm Regards,  
// Team Motherland Pure  
// www.motherlandpure.com  
// support@motherlandpure.com
//       `,
//     });
//     console.log('info', info)
//     return true;
//   } catch (error) {
//     console.error("Order confirmation email error:", error);
//     return false;
//   }
// });

const sendOrderConfirmationEmail = asyncHandler(async ({
  userName,
  email,
  orderItems,
  orderId,
  subtotal,
  discount,
  tax,
  shipping,
  totalPrice,
  shippingAddress,
  billingAddress,
  visualId
}) => {
  try {

    const itemsHtml = orderItems.map(item => `
      <tr>
        <td style="padding:12px 0;">
          <strong>${item.name}</strong> × ${item.qty}<br/>
            <img 
              src="${item.image}" 
              alt="${item.name}" 
              style="width:60px;height:auto;margin-top:6px;display:block;"
            />
          <span style="color:#666;font-size:13px;">${item.weight} gram</span>
        </td>
        <td align="right">₹ ${item.finalPrice}</td>
      </tr>
    `).join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Order Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:24px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:24px;border-radius:6px;">
          
          <!-- Header -->
          <tr>
            <td style="font-size:20px;font-weight:bold;">
              Motherland Pure
            </td>
            <td align="right" style="color:#666;">
              ORDER #${visualId || orderId}
            </td>
          </tr>

          <tr><td colspan="2" style="height:16px;"></td></tr>

          <!-- Message -->
          <tr>
            <td colspan="2">
              <h2 style="margin:0;">Thank you for your purchase!</h2>
              <p style="color:#555;">
                We're getting your order ready to be shipped.
                We will notify you when it has been sent.
              </p>
            </td>
          </tr>

          <!-- Buttons -->
          <tr>
            <td colspan="2" style="padding:20px 0;">
              <a href="https://motherlandpure.com/orders/${orderId}"
                 style="background:#007bff;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;">
                 View your order
              </a>
              &nbsp;&nbsp;
              <a href="https://motherlandpure.com"
                 style="color:#007bff;text-decoration:none;">
                 Visit our store
              </a>
            </td>
          </tr>

          <!-- Order Summary -->
          <tr>
            <td colspan="2">
              <h3 style="border-bottom:1px solid #eee;padding-bottom:8px;">
                Order summary
              </h3>
            </td>
          </tr>

          <tr>
            <td colspan="2">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${itemsHtml}

                <tr><td colspan="2"><hr/></td></tr>

                <tr>
                  <td>Subtotal</td>
                  <td align="right">₹ ${subtotal}</td>
                </tr>

                <tr>
                  <td>Order discount</td>
                  <td align="right">- ₹ ${discount}</td>
                </tr>

                <tr>
                  <td>Shipping</td>
                  <td align="right">₹ ${shipping}</td>
                </tr>

                <tr>
                  <td>Taxes</td>
                  <td align="right">${tax} %</td>
                </tr>

                <tr>
                  <td style="font-weight:bold;padding-top:8px;">Total</td>
                  <td align="right" style="font-weight:bold;padding-top:8px;">
                    ₹ ${totalPrice}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer Info -->
          <tr><td colspan="2" style="height:24px;"></td></tr>

          <tr>
            <td colspan="2">
              <h3 style="border-bottom:1px solid #eee;padding-bottom:8px;">
                Customer information
              </h3>
            </td>
          </tr>

          <tr>
            <td width="50%" valign="top">
              <strong>Shipping address</strong><br/>
              ${userName}<br/>
              ${shippingAddress.area}<br/>
              ${shippingAddress.city}, ${shippingAddress.state}<br/>
              ${shippingAddress.pincode}<br/>
              India
            </td>

            <td width="50%" valign="top">
              <strong>Billing address</strong><br/>
              ${userName}<br/>
              ${shippingAddress.area}<br/>
              ${shippingAddress.city}, ${billingAddress.state}<br/>
              ${shippingAddress.pincode}<br/>
              India
            </td>
          </tr>

          <tr><td colspan="2" style="height:32px;"></td></tr>

          <!-- Footer -->
          <tr>
            <td colspan="2" align="center" style="color:#999;font-size:13px;">
              © ${new Date().getFullYear()} Motherland Pure<br/>
              support@motherlandpure.com
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await orderTransporter.sendMail({
      from: `Motherland Pure <${process.env.ORDER_EMAIL}>`,
      to: email,
      subject: "Order Confirmation - Motherland Pure",
      html
    });

    return true;

  } catch (error) {
    console.error("Order confirmation email error:", error);
    return false;
  }
});


module.exports = {
  sendResetEmail,
  sendVerificationEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendBulkEmail,
  sendAbandonedCartEmail,
  sendOrderConfirmationEmail
}

