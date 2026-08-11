
// const notFound = (req, res, next) => {
//     const error = new Error(`Not Found - ${req.originalUrl}`)
//     res.status(404)
//     next(error)
// }

// const errorHandler = async (err, req, res, next) => {
//     let statusCode = res.statusCode === 200 ? 500 : res.statusCode
//     let message = err.message

//     logger.error(err); 


//     if(err.name === 'CastError' && err.kind === 'ObjectId') {
//         statusCode = 404
//         message = 'Resource not Found'
//     }
//     if (err.code === 11000) {
//         statusCode = 400,
//         message = 'Email already exists. Please use a different email'
//       }

//     res.status(statusCode).json({
//         status: false,
//         message,
//         stack: process.env.NODE_ENV === 'DEVELOPMENT' ? err.stack : null
//     })
// }

// const errorHandler = async (err, req, res, next) => {

//   if (err && typeof err === "object" && typeof err.message === "object") {
//     return res.status(err.code || 400).json({
//       status: false,
//       message: err.message,
//       stack: process.env.NODE_ENV === "DEVELOPMENT" ? err.stack : null
//     });
//   }

//   let statusCode = err.code && typeof err.code === "number"
//     ? err.code
//     : (res.statusCode === 200 ? 500 : res.statusCode);

//   let messageText = err.message || "Server Error";

//   let message = {
//     en: messageText,
//     ar: messageText
//   };

//   if (err.name === "CastError" && err.kind === "ObjectId") {
//     statusCode = 404;
//     message = {
//       en: "Resource not found",
//       ar: "المورد غير موجود"
//     };
//   }

//   if (err.code === 11000) {
//     statusCode = 400;
//     message = {
//       en: "Email already exists",
//       ar: "البريد الإلكتروني مستخدم بالفعل"
//     };
//   }

//   res.status(statusCode).json({
//     status: false,
//     message,
//     stack: process.env.NODE_ENV === "DEVELOPMENT" ? err.stack : null
//   });
// };


const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode =
    err.code && typeof err.code === "number"
      ? err.code
      : res.statusCode === 200
      ? 500
      : res.statusCode;

  let message = err.message || "Server Error";

  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found";
  }

  if (err.code === 11000) {
    statusCode = 400;
    message = "Email already exists";
  }

  res.status(statusCode).json({
    status: false,
    message,
    stack: process.env.NODE_ENV === "DEVELOPMENT" ? err.stack : null
  });
};


module.exports = {
    notFound,
    errorHandler
}