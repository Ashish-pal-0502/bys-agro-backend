const Cart = require('../models/cartModel')
const { sendAbandonedCartEmail } = require('../middleware/handleEmail')

const abandonedCartEmail = async () => {
  console.log('Running abandoned cart...');

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const carts = await Cart.find({
    createdAt: { $lte: twentyFourHoursAgo },
    emailSent: false,
  })
    .populate('user')
    .populate('product');

  const userCartMap = {};

  // console.log('carts', carts)

  carts.forEach(cart => {
    const userId = cart.user?._id?.toString();

    if (!userCartMap[userId]) {
      userCartMap[userId] = {
        user: cart.user,
        // products: [],
        cartIds: []
      };
    }

    // userCartMap[userId].products.push(cart.product);
    userCartMap[userId].cartIds.push(cart?._id);
  });

  for (const userId in userCartMap) {
    const { user, cartIds } = userCartMap[userId];

    const fullCart = await Cart.find({ user: user?._id })
      .populate('product');

    const products = fullCart.map(cart => ({
      ...cart.product._doc,
      quantity: cart.quantity
    }));

    const isSent = await sendAbandonedCartEmail(
      user.email,
      user.firstName,
      products
    );

    if (isSent) {
      await Cart.updateMany(
        { _id: { $in: cartIds } },
        { emailSent: true }
      );
    }
  }
}

module.exports = {
  abandonedCartEmail
}