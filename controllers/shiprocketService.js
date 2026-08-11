const axios = require("axios");
const { getShiprocketToken } = require("../middleware/shiprocketAuth");
const Order = require('../models/orderModel')
const PinCode = require('../models/pincodeModel')
const asyncHandler = require('express-async-handler')
const User = require('../models/userModel.js')
const dayjs = require("dayjs");
const { createSingleParcel } = require('../controllers/checkSlab.js')
// async function checkServiceability(req, res) {
//   try {
//     const {
//       pickupPincode,
//       deliveryPincode,
//       weight,
//       length,
//       breadth,
//       height,
//       paymentMethod
//     } = req.body;

//     // 🔴 Basic validation
//     if (!pickupPincode || !deliveryPincode || !weight || !paymentMethod) {
//       return res.status(400).json({
//         message: "Missing required parameters"
//       });
//     }

//     const token = await getShiprocketToken();

//     // COD logic (mandatory)
//     const cod = paymentMethod.toUpperCase() === "COD" ? 1 : 0;

//     // Shiprocket params (convert to numbers)
//     const params = {
//       pickup_postcode: pickupPincode,
//       delivery_postcode: deliveryPincode,
//       weight: Number(weight),
//       cod
//     };

//     // Optional volumetric dimensions
//     if (length && breadth && height) {
//       params.length = Number(length);
//       params.breadth = Number(breadth);
//       params.height = Number(height);
//     }

//     const response = await axios.get(
//       "https://apiv2.shiprocket.in/v1/external/courier/serviceability",
//       {
//         headers: {
//           Authorization: `Bearer ${token}`
//         },
//         params
//       }
//     );

//     return res.status(200).json({
//       success: true,
//       message: "Serviceability fetched successfully",
//       data: response.data
//     });

//   } catch (error) {
//     console.error(
//       "Shiprocket serviceability error:",
//       error.response?.data || error.message
//     );

//     return res.status(500).json({
//       success: false,
//       message: "Shiprocket serviceability failed",
//       error: error.response?.data || error.message
//     });
//   }
// }




function getCheapestCourier(couriers) {
  if (!couriers || couriers.length === 0) return null;

  const validCouriers = couriers.filter(
    c => c.rate !== "" && !isNaN(Number(c.rate))
  );

  if (validCouriers.length === 0) return null;

  return validCouriers.reduce((min, courier) =>
    Number(courier.rate) < Number(min.rate) ? courier : min
  );
}


function getRecommendedCourier(couriers, recommendedId) {
  if (!recommendedId) return null;

  return couriers.find(
    courier => courier.courier_company_id === recommendedId
  ) || null;
}

// async function checkServiceability(req, res) {
//   try {
//     const {
//       pickupPincode=226003,
//       deliveryPincode,
//       items = [],
//       weight,
//       length,
//       width,
//       height,
//       paymentMethod
//     } = req.body;

//     if (!pickupPincode || !deliveryPincode || !weight) {
//       return res.status(400).json({
//         success: false,
//         message: "pickupPincode, deliveryPincode and weight are required"
//       });
//     }

//     const pincodes = await PinCode.find({}).lean()
//     const zips = pincodes.map((item) => item.zip)

//     if(zips.includes(deliveryPincode) && paymentMethod === 'COD') {
//       return res.status(400).send({ success: false, message: "Pincode not serviceable" })
//     }

//     const token = await getShiprocketToken();
//     const cod = paymentMethod === "COD" ? 1 : 0;

//     const params = {
//       pickup_postcode: pickupPincode,
//       delivery_postcode: deliveryPincode,
//       weight,
//       cod
//     };

//     if (length && width && height) {
//       params.length = length;
//       params.breadth = width;
//       params.height = height;
//     }

//     const response = await axios.get(
//       "https://apiv2.shiprocket.in/v1/external/courier/serviceability",
//       {
//         headers: {
//           Authorization: `Bearer ${token}`
//         },
//         params
//       }
//     );

//     const data = response.data.data;
//     const couriers = data.available_courier_companies;

//     if (!couriers || couriers.length === 0) {
//       return res.json({
//         success: true,
//         serviceable: false
//       });
//     }

//     const cheapestCourier = getCheapestCourier(couriers);
//     const recommendedCourier = getRecommendedCourier(
//       couriers,
//       data.recommended_courier_company_id
//     );

//     return res.json({
//       success: true,
//       serviceable: true,
//       cheapestCourier,
//       recommendedCourier
//     });

//   } catch (error) {
//     console.error(
//       "Shiprocket serviceability error:",
//       error.response?.data || error.message
//     );

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch serviceability",
//       error: error.response?.data || error.message
//     });
//   }
// }

async function checkServiceability(req, res) {
  try {
    const {
      pickupPincode = "226003",
      deliveryPincode,
      weight,
      length,
      width,
      height,
      paymentMethod
    } = req.body;

    if (!pickupPincode || !deliveryPincode || !weight) {
      return res.status(400).json({
        success: false,
        message: "pickupPincode, deliveryPincode and weight are required"
      });
    }

    const pincodes = await PinCode.find({}).lean();
    const zips = pincodes.map((item) => item.zip);

    if (zips.includes(deliveryPincode)) {
      return res.status(400).json({
        success: false,
        serviceable: false,
        message: "COD not available for this pincode"
      });
    }

    const token = await getShiprocketToken();
    const cod = paymentMethod === "COD" ? 1 : 0;

    const params = {
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight,
      cod
    };

    if (length && width && height) {
      params.length = length;
      params.breadth = width;
      params.height = height;
    }

    const response = await axios.get(
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability",
      {
        headers: { Authorization: `Bearer ${token}` },
        params
      }
    );

    const apiData = response.data;

    if (!apiData?.data) {
      return res.json({
        success: true,
        serviceable: false,
        message: apiData?.message || "Not serviceable"
      });
    }

    const couriers = apiData.data.available_courier_companies;

    if (!Array.isArray(couriers) || couriers.length === 0) {
      return res.json({
        success: true,
        serviceable: false,
        message: "No couriers available for this shipment"
      });
    }

    const cheapestCourier = getCheapestCourier(couriers);
    const recommendedCourier = getRecommendedCourier(
      couriers,
      apiData.data.recommended_courier_company_id
    );

    return res.json({
      success: true,
      serviceable: true,
      cheapestCourier,
      recommendedCourier
    });

  } catch (error) {
    console.error(
      "Shiprocket serviceability error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch serviceability",
      error: error.response?.data || error.message
    });
  }
}

function normalizeCourier(courier) {
  if (!courier) return null;

  return {
    courier_company_id: courier.courier_company_id,
    courier_name: courier.courier_name,
    rate: Number(courier.rate),
    etd_hours: Number(courier.etd_hours),
    estimated_delivery_days: courier.estimated_delivery_days || null,
    min_weight: courier.min_weight,
    max_weight: courier.max_weight
  };
}



// function getCheapest(couriers) {
//   if (couriers.length === 0) return null;

//   let cheapest = couriers[0];

//   for (let i = 1; i < couriers.length; i++) {
//     if (Number(couriers[i].rate) < Number(cheapest.rate)) {
//       cheapest = couriers[i];
//     }
//   }

//   return cheapest;
// }


// function getFastest(couriers) {
//   if (couriers.length === 0) return null;

//   let fastest = couriers[0];

//   for (let i = 1; i < couriers.length; i++) {
//     if (Number(couriers[i].etd_hours) < Number(fastest.etd_hours)) {
//       fastest = couriers[i];
//     }
//   }

//   return fastest;
// }


// function getRecommended(couriers, recommendedId) {
//   for (let i = 0; i < couriers.length; i++) {
//     if (couriers[i].courier_company_id === recommendedId) {
//       return couriers[i];
//     }
//   }
//   return null; 
// }


function getCheapest(couriers) {
  if (!couriers?.length) return null;

  let cheapest = couriers[0];

  for (let i = 1; i < couriers.length; i++) {
    if (Number(couriers[i].rate) < Number(cheapest.rate)) {
      cheapest = couriers[i];
    }
  }

  return normalizeCourier(cheapest);
}

function getFastest(couriers) {
  if (!couriers?.length) return null;

  let fastest = couriers[0];

  for (let i = 1; i < couriers.length; i++) {
    if (Number(couriers[i].etd_hours) < Number(fastest.etd_hours)) {
      fastest = couriers[i];
    }
  }

  return normalizeCourier(fastest);
}

function getRecommended(couriers, recommendedId) {
  const courier = couriers.find(
    c => c.courier_company_id === recommendedId
  );

  return normalizeCourier(courier);
}




async function calculateShippingCost(req, res) {
  try {
    const {
      pickupPincode = "226003",
      deliveryPincode,
      weight,
      length,
      breadth,
      height,
      paymentMethod,
      total
    } = req.body;

    if (!pickupPincode || !deliveryPincode || !weight) {
      return res.status(400).json({
        success: false,
        message: "pickupPincode, deliveryPincode and weight are required"
      });
    }

    const token = await getShiprocketToken();
    const cod = paymentMethod === "COD" ? 1 : 0;

    const params = {
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight: Number(weight),
      cod
    };

    if (length && breadth && height) {
      params.length = Number(length);
      params.breadth = Number(breadth);
      params.height = Number(height);
    }

    const response = await axios.get(
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability",
      {
        headers: { Authorization: `Bearer ${token}` },
        params
      }
    );

    const data = response.data.data;
    const couriers = data.available_courier_companies;

    if (!couriers || couriers.length === 0) {
      return res.json({
        success: true,
        serviceable: false
      });
    }

    const cheapest = getCheapest(couriers);
    const fastest = getFastest(couriers);

    const recommended = getRecommended(
      couriers,
      data.recommended_courier_company_id
    );

    let delivery;
    let message;

    if (total && recommended?.rate != null) {
      const totalAmount = Number(total);
      const recommendedRate = Number(recommended.rate);

      if (totalAmount >= 500 && totalAmount < 1000) {
        delivery = recommendedRate <= 100;

        if (delivery) {
          message = `Your total value is ₹${totalAmount} and it satisfies the free delivery condition, so your delivery is free.`;
        }
      }
      else if (totalAmount >= 1000) {
        delivery = recommendedRate <= 150;

        if (delivery) {
          message = `Your total value is ₹${totalAmount} and it satisfies the free delivery condition, so your delivery is free.`;
        }
      }
      else {
        delivery = false;
      }
    }

    return res.json({
      success: true,
      serviceable: true,
      cheapest: {
        name: cheapest.courier_name,
        cost: cheapest.rate,
        delivery_days: cheapest.estimated_delivery_days,
        delivery_hours: cheapest.etd_hours
      },
      fastest: {
        name: fastest.courier_name,
        cost: fastest.rate,
        delivery_days: fastest.estimated_delivery_days,
        delivery_hours: fastest.etd_hours
      },
      recommended: {
        name: recommended?.courier_name,
        cost: recommended?.rate,
        delivery_days: recommended?.estimated_delivery_days,
        delivery_hours: recommended?.etd_hours,
        ...(delivery !== undefined && { delivery }),
        ...(message && { message })
      }
    });

  } catch (error) {
    console.error("Shipping cost error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to calculate shipping cost"
    });
  }
}

const { groupOrderItemsForShipping, getDeliveryInfo } = require('../controllers/checkSlab.js')

// const calculateShippingForOrder = asyncHandler(async (req, res) => {
//   try {
//     const { orderItems, pickupPincode = "226003", deliveryPincode, paymentMethod } = req.body;

//     if (!orderItems?.length || !deliveryPincode) {
//       return res.status(400).json({
//         success: false,
//         message: "orderItems and deliveryPincode are required",
//       });
//     }

//     const parcels = groupOrderItemsForShipping(orderItems);
//     const totalPrice = orderItems.reduce(
//       (sum, item) => sum + item.finalPrice * (item.qty || 1),
//       0
//     );

//     const token = await getShiprocketToken();
//     const cod = paymentMethod === "COD" ? 1 : 0;

//     const totalCosts = { cheapest: 0, fastest: 0, recommended: 0 };
//     let courierDetails = { cheapest: null, fastest: null, recommended: null };

//     for (const parcel of parcels) {

//       const params = {
//         pickup_postcode: pickupPincode,
//         delivery_postcode: deliveryPincode,
//         weight: parcel.totalWeight / 1000, 
//         length: parcel.totalLength || 10,
//         breadth: parcel.totalWidth || 10,
//         height: parcel.totalHeight || 10,
//         cod,
//       };

//       const response = await axios.get(
//         "https://apiv2.shiprocket.in/v1/external/courier/serviceability",
//         { headers: { Authorization: `Bearer ${token}` }, params }
//       );

//       const data = response.data.data;
//       const couriers = data.available_courier_companies;
//       if (!couriers?.length) continue;

//       const cheapest = getCheapest(couriers);
//       const fastest = getFastest(couriers);
//       const recommended = getRecommended(couriers, data.recommended_courier_company_id);

//       totalCosts.cheapest += cheapest.rate;
//       totalCosts.fastest += fastest.rate;
//       totalCosts.recommended += recommended?.rate || 0;

//       courierDetails = { cheapest, fastest, recommended };
//     }

//     const cheapestDeliveryInfo = getDeliveryInfo(totalPrice, totalCosts.cheapest);
//     const fastestDeliveryInfo = getDeliveryInfo(totalPrice, totalCosts.fastest);
//     const recommendedDeliveryInfo = getDeliveryInfo(totalPrice, totalCosts.recommended);

//     return res.json({
//       success: true,
//       serviceable: true,
//       parcels,
//       totalShippingCost: totalCosts,
//       cheapest: { ...courierDetails.cheapest, cost: totalCosts.cheapest, ...cheapestDeliveryInfo },
//       fastest: { ...courierDetails.fastest, cost: totalCosts.fastest, ...fastestDeliveryInfo },
//       recommended: { ...courierDetails.recommended, cost: totalCosts.recommended, ...recommendedDeliveryInfo },
//     });

//   } catch (error) {
//     console.error("Shipping calculation error:", error.response?.data || error.message);
//     res.status(500).json({
//       success: false,
//       message: "Failed to calculate shipping cost",
//     });
//   }
// });


const calculateShippingForOrder = asyncHandler(async (req, res) => {
  try {
    const {
      orderItems,
      pickupPincode = "226003",
      deliveryPincode,
      paymentMethod
    } = req.body;

    if (!orderItems?.length || !deliveryPincode) {
      return res.status(400).json({
        success: false,
        message: "orderItems and deliveryPincode are required",
      });
    }

    const parcel = createSingleParcel(orderItems);

    const totalPrice = orderItems.reduce(
      (sum, item) => sum + item.finalPrice * (item.qty || 1),
      0
    );

    const token = await getShiprocketToken();
    const cod = paymentMethod === "COD" ? 1 : 0;

    const params = {
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight: parcel.totalWeight / 1000,
      length: parcel.totalLength || 10,
      breadth: parcel.totalWidth || 10,
      height: parcel.totalHeight || 10,
      cod,
    };

    const response = await axios.get(
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability",
      { headers: { Authorization: `Bearer ${token}` }, params }
    );

    const data = response.data.data;
    const couriers = data.available_courier_companies;

    if (!couriers?.length) {
      return res.json({
        success: true,
        serviceable: false,
      });
    }

    const cheapest = getCheapest(couriers);
    const fastest = getFastest(couriers);
    const recommended = getRecommended(
      couriers,
      data.recommended_courier_company_id
    );

    const cheapestDeliveryInfo = getDeliveryInfo(
      totalPrice,
      cheapest?.rate,
      paymentMethod
    );
    const fastestDeliveryInfo = getDeliveryInfo(
      totalPrice,
      fastest?.rate,
      paymentMethod
    );
    const recommendedDeliveryInfo = getDeliveryInfo(
      totalPrice,
      recommended?.rate,
      paymentMethod
    );

    return res.json({
      success: true,
      serviceable: true,
      parcel,

      totalShippingCost: {
        cheapest: cheapest?.rate || 0,
        fastest: fastest?.rate || 0,
        recommended: recommended?.rate || 0
      },

      cheapest: cheapest && {
        courier_id: cheapest.courier_company_id,
        estimated_delivery_days: cheapest.estimated_delivery_days,
        courier_name: cheapest.courier_name,
        cost: cheapest.rate,
        delivery_hours: cheapest.etd_hours,
        ...cheapestDeliveryInfo
      },

      fastest: fastest && {
        courier_id: fastest.courier_company_id,
        estimated_delivery_days: fastest.estimated_delivery_days,
        courier_name: fastest.courier_name,
        cost: fastest.rate,
        delivery_hours: fastest.etd_hours,
        ...fastestDeliveryInfo
      },

      recommended: recommended && {
        courier_id: recommended.courier_company_id,
        courier_name: recommended.courier_name,
        estimated_delivery_days: recommended.estimated_delivery_days,
        cost: recommended.rate,
        delivery_hours: recommended.etd_hours,
        ...recommendedDeliveryInfo
      }
    });

  } catch (error) {
    console.error(
      "Shipping calculation error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      message: "Failed to calculate shipping cost",
    });
  }
});


async function createWarehouse(req, res) {
  try {

    const token = await getShiprocketToken();
    console.log('token', token)
    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/settings/company/addpickup",
      req.body,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      success: true,
      pickup: response.data
    });
  } catch (error) {
    console.log('error', error)
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
}

async function getWarehouses(req, res) {
  try {
    const token = await getShiprocketToken();

    const response = await axios.get(
      "https://apiv2.shiprocket.in/v1/external/settings/company/pickup",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return res.json({
      success: true,
      warehouses: response.data.data
    });
  } catch (error) {
    console.error("Get warehouse error:", error.response?.data);
    return res.status(500).json({
      success: false,
      error: error.response?.data
    });
  }
}

async function deleteWarehouse(req, res) {
  try {
    const { pickup_id } = req.query;

    if (!pickup_id) {
      return res.status(400).json({
        success: false,
        message: "pickup_id is required"
      });
    }

    const token = await getShiprocketToken();

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/settings/company/deletepickup",
      {
        pickup_id: Number(pickup_id)
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json({
      success: true,
      message: "Warehouse deleted successfully",
      shiprocket_response: response.data
    });

  } catch (error) {
    console.error("Delete warehouse error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
}



async function createShiprocketShipment(orderId) {
  const order = await Order.findById(orderId);

  if (!order) throw new Error("Order not found");

  const token = await getShiprocketToken();

  const orderItems = order.orderItems.map(item => ({
    name: item.name,
    sku: item.product?.toString() || "SKU_" + Date.now(),
    units: item.qty,
    selling_price: item.finalPrice
  }));

  const totalWeight =
    order.orderItems.reduce((sum, item) => sum + item.qty * 0.5, 0.5);

  const createOrderPayload = {
    order_id: order._id.toString(),
    order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
    pickup_location: "Ardvera Naturals LLP ",
    billing_customer_name: order.shippingAddress.address,
    billing_last_name: "",
    billing_address: order.shippingAddress.address,
    billing_city: order.shippingAddress.city,
    billing_pincode: order.shippingAddress.pincode,
    billing_state: order.shippingAddress.state,
    billing_country: "India",
    billing_email: order.shippingAddress.email,
    billing_phone: order.shippingAddress.mobileNumber,
    shipping_is_billing: true,
    order_items: orderItems,
    payment_method:
      order.paymentMethod === "COD" ? "COD" : "Prepaid",
    sub_total: order.totalPrice,
    length: 10,
    breadth: 10,
    height: 10,
    weight: totalWeight
  };

  const orderResponse = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
    createOrderPayload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );

  const {
    order_id,
    shipment_id,
    courier_company_id,
    courier_name,
    awb_code
  } = orderResponse.data;

  order.shiprocket = {
    order_id,
    shipment_id,
    awb: awb_code,
    courier_name,
    courier_id: courier_company_id,
    shipping_cost: order.shippingPrice,
    status: "AWB Generated"
  };

  order.wayBill = awb_code;
  await order.save();

  return {
    shipment_id,
    awb: awb_code,
    courier_name
  };
}


async function createShiprocketOrderTest(req, res) {
  try {
    const token = await getShiprocketToken();

    const orderPayload = {
      order_id: "ORD_" + Date.now(),
      order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      pickup_location: "Ardvera Naturals LLP ",

      billing_customer_name: "Test",
      billing_last_name: "User",
      billing_address: "624/New-1, ABC",
      billing_city: "Lucknow",
      billing_pincode: "226010",
      billing_state: "Uttar Pradesh",
      billing_country: "India",
      billing_email: "test@email.com",
      billing_phone: "9876543210",

      shipping_is_billing: true,
      payment_method: "PREPAID",
      order_items: [
        {
          name: "Honey Bottle",
          sku: "HONEY001",
          units: 1,
          selling_price: 299
        }
      ],

      payment_method: "Prepaid",
      sub_total: 299,
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5
    };

    const orderRes = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
      orderPayload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const shipmentId = orderRes.data.shipment_id;
    const orderId = orderRes.data.order_id;
    console.log('orderRes', orderRes.data)
    const serviceabilityRes = await axios.get(
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability",
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          pickup_postcode: "226010",
          delivery_postcode: "273001",
          weight: 0.5,
          cod: 0
        }
      }
    );

    const recommendedCourierId =
      serviceabilityRes.data.data.recommended_courier_company_id;
    console.log('recommendedCourierId', recommendedCourierId)


    const awbRes = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/courier/assign/awb",
      {
        shipment_id: shipmentId,
        courier_id: recommendedCourierId
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return res.json({
      success: true,
      shipment_id: shipmentId,
      awb: awbRes.data.awb_code,
      courier_id: recommendedCourierId,
      orderId
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
}



async function generateAWB(req, res) {
  try {
    const { shipment_id, courier_id } = req.body;

    if (!shipment_id) {
      return res.status(400).json({
        success: false,
        message: "shipment_id is required"
      });
    }

    const token = await getShiprocketToken();

    const payload = courier_id
      ? { shipment_id, courier_id }
      : { shipment_id };

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/courier/assign/awb",
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json({
      success: true,
      awb: response.data.awb_code,
      courier_name: response.data.courier_name,
      courier_id: response.data.courier_company_id
    });

  } catch (error) {
    console.error("AWB error:", error.response?.data);

    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
}



// async function createShiprocketShipmentForOrder(orderId) {
//   try {
//     const order = await Order.findById(orderId);
//     const user = await User.findById(order.user)
//     if (!order) throw new Error("Order not found");
//     if (!order.orderItems || order.orderItems.length === 0)
//       throw new Error("Order has no items");

//     const token = await getShiprocketToken();
//     const isCOD = order.paymentMethod === "COD";
//     const cod = isCOD ? 1 : 0;

//     const items = order.orderItems.map((item, idx) => ({
//       name: item.name,
//       sku: item.product?.toString() || `SKU_${idx + 1}`,
//       units: item.qty,
//       selling_price: item.finalPrice,
//       tax: 5,
//       hsn: "04090000"
//     }));

//     const userName = user.firstName || 'Customer'

//     const createOrderPayload = {
//       order_id: order._id.toString(),
//       order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
//       pickup_location: "Flat",
//       pickup_postcode: "226003",
//       billing_customer_name: userName,
//       billing_last_name: "",
//       billing_address: order.shippingAddress.area,
//       billing_city: order.shippingAddress.city,
//       billing_pincode: order.shippingAddress.pincode,
//       billing_state: order.shippingAddress.state,
//       billing_country: "India",
//       billing_email: order.shippingAddress.email,
//       billing_phone: order.shippingAddress.mobileNumber,
//       shipping_is_billing: true,
//       order_items: items,
//       payment_method: isCOD ? "COD" : "PREPAID",
//       sub_total: order.totalPrice,
//       length: order.totalLength,
//       breadth: order.totalWidth,
//       height: order.totalHeight,
//       weight: order.totalWeight / 1000,
//       shipping_charges: order.shippingPrice,
//     };

//     console.log('createOrderPayload', createOrderPayload)

//     const orderRes = await axios.post(
//       "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
//       createOrderPayload,
//       { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
//     );

//     console.log('orderRes', orderRes.data)

//     const shiprocketOrderId = orderRes.data.order_id;
//     const shipmentId = orderRes.data.shipment_id;

//     const paramsData = {
//           pickup_postcode: "226003",
//           delivery_postcode: order.shippingAddress.pincode,
//           weight: order.totalWeight / 1000,
//           cod,
//           length: order.totalLength,
//           breadth: order.totalWidth,
//           height: order.totalHeight
//     }

//     console.log('paramsData', paramsData)

//    let awbCode = "";
//     try {
//       const awbRes = await axios.post(
//         "https://apiv2.shiprocket.in/v1/external/courier/assign/awb",
//         { shipment_id: shipmentId, courier_id: order.courierId },
//         { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
//       );
//       console.log('awbRes', awbRes)
//       awbCode = awbRes.data.response?.data?.awb_code;
//       awbData = awbRes.data.response.data
//     } catch {
//       console.error("AWB assignment failed:", err.response?.data || err.message);
//       awbCode = "DUMMY-AWB-" + Math.floor(Math.random() * 100000);
//     }

//     order.shipment = {
//       shiprocketOrderId,
//       shipmentId,
//       awb: awbCode,
//       awbData: awbData,
//       courierCompanyId: order.courierId,
//       courierName: order.courierName,
//       shippingCost: order.shippingPrice,
//       estimatedDeliveryDays: order.estimatedDeliveryDays
//     };

//     await order.save();

//     return {
//       shiprocketOrderId,
//       shipmentId,
//       awb: awbCode,
//       courier: order.shipment.courierName,
//       shippingCost: order.shipment.shippingCost,
//       estimatedDeliveryDays: order.shipment.estimatedDeliveryDays
//     };
//   } catch (error) {
//     console.error("Shiprocket shipment creation failed:", error.response?.data || error.message);
//     throw error;
//   }
// }

async function createShiprocketShipmentForOrder(orderId) {
  try {
    const order = await Order.findById(orderId);
    const user = await User.findById(order.user);

    if (!order) throw new Error("Order not found");
    if (!order.orderItems?.length) throw new Error("Order has no items");
    if (!order.courierId) throw new Error("Courier not selected for this order");

    const token = await getShiprocketToken();
    const isCOD = order.paymentMethod === "COD";

    const items = order.orderItems.map((item, idx) => ({
      name: item.name + " " + item.itemWeight + " gm",
      sku: item.product?.toString() || `SKU_${idx + 1}`,
      units: item.qty,
      selling_price: item.finalPrice,
      tax: 5,
      hsn: "04090000"
    }));
    // console.log("items", items)

    const userName = user.firstName || "Customer";

    const createOrderPayload = {
      order_id: order._id.toString(),
      order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      pickup_location: "Ardvera Naturals LLP",
      pickup_postcode: "226003",

      billing_customer_name: userName,
      billing_last_name: "",
      billing_address: order.shippingAddress.area,
      billing_city: order.shippingAddress.city,
      billing_pincode: order.shippingAddress.pincode,
      billing_state: order.shippingAddress.state,
      billing_country: "India",
      billing_email: order.shippingAddress.email,
      billing_phone: order.shippingAddress.mobileNumber,

      shipping_is_billing: true,
      order_items: items,
      payment_method: isCOD ? "COD" : "PREPAID",
      sub_total: order.totalPrice - order.shippingPrice,

      length: order.totalLength,
      breadth: order.totalWidth,
      height: order.totalHeight,
      weight: order.totalWeight / 1000,
      shipping_charges: order.shippingPrice,
    };

    // console.log('createOrderPayload', createOrderPayload)

    const orderRes = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
      createOrderPayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    // console.log("orderRes", orderRes.data);

    const shiprocketOrderId = orderRes.data.order_id;
    const shipmentId = orderRes.data.shipment_id;

    let awbCode = "";
    let awbData = null;

    const awbRes = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/courier/assign/awb",
      {
        shipment_id: shipmentId,
        courier_id: order.courierId
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    // console.log('awbRes', awbRes.data)

    awbCode = awbRes.data.response?.data?.awb_code || "";
    awbData = awbRes.data.response?.data || null;

    order.shipment = {
      shiprocketOrderId,
      shipmentId,
      awb: awbCode,
      awbData,
      courierCompanyId: order.courierId,
      courierName: order.courierName,
      shippingCost: order.shippingPrice,
      estimatedDeliveryDays: order.estimatedDeliveryDays
    };

    await order.save();

    return {
      shiprocketOrderId,
      shipmentId,
      awb: awbCode,
      courier: order.courierName,
      shippingCost: order.shippingPrice,
      estimatedDeliveryDays: order.estimatedDeliveryDays
    };

  } catch (error) {
    console.error(
      "Shiprocket shipment creation failed:",
      error.response?.data || error.message
    );
    throw error;
  }
}


const cancelShiprocketOrder = async (req, res) => {
  try {
    const { shiprocketOrderId } = req.body;

    if (!shiprocketOrderId) {
      return res.status(400).json({
        success: false,
        message: "shiprocketOrderId is required",
      });
    }

    const token = await getShiprocketToken();

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/cancel",
      { order_id: shiprocketOrderId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.json({
      success: true,
      message: "Order cancelled successfully",
      data: response.data,
    });

  } catch (error) {
    console.log('error', error)
    console.error("Cancel order failed:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || "Failed to cancel order",
    });
  }
};


const cancelShiprocketAWBs = async (req, res) => {
  try {
    const { awbs } = req.body;

    if (!awbs || !Array.isArray(awbs) || awbs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "awbs must be a non-empty array",
      });
    }

    const token = await getShiprocketToken();

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/cancel/shipment/awbs",
      { awbs },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.json({
      success: true,
      message: "AWB(s) cancelled successfully",
      data: response.data,
    });

  } catch (error) {
    console.error("Cancel AWB failed:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || "Failed to cancel AWB(s)",
    });
  }
};


// const cancelShipmentByOrderId = async (req, res) => {
//   try {
//     const { orderId } = req.body;

//     if (!orderId) {
//       return res.status(400).json({
//         success: false,
//         message: "orderId is required",
//       });
//     }

//     const order = await Order.findById(orderId);
//     console.log('order', order)
//     if (!order || !order.shipment?.awb) {
//       return res.status(404).json({
//         success: false,
//         message: "Order or AWB not found",
//       });
//     }

//     const awb = order.shipment.awb;

//     if (awb.startsWith("DUMMY")) {
//       order.shipment.status = "Cancelled";
//       await order.save();
//       return res.json({
//         success: true,
//         message: "Dummy AWB marked as cancelled in DB",
//         awb,
//       });
//     }

//     const token = await getShiprocketToken();

//     const response = await axios.post(
//       "https://apiv2.shiprocket.in/v1/external/orders/cancel/shipment/awbs",
//       { awbs: [awb] },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     console.log('response', response)

//     if (response.data && response.data.status_code === 200) {
//       order.shipment.status = "Cancelled";
//       await order.save();
//       return res.json({
//         success: true,
//         message: "AWB cancelled successfully",
//         data: response.data,
//         awb,
//       });
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: response.data?.message || "Failed to cancel AWB",
//         data: response.data,
//         awb,
//       });
//     }

//   } catch (error) {
//     console.error("Cancel AWB failed:", error.response?.data || error.message);
//     return res.status(500).json({
//       success: false,
//       message: error.response?.data?.message || "Failed to cancel AWB",
//     });
//   }
// };

const cancelShipmentByOrderId = async (req, res) => {
  try {
    const { orderId } = req.body;
    // console.log("orderId", orderId)
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required",
      });
    }

    const order = await Order.findById(orderId);
    // console.log("order", order)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const shipment = order.shipment || {};

    if (shipment?.awb?.startsWith("DUMMY")) {
      shipment.status = "Cancelled";
      order.deliveryStatus = "Cancelled";
      await order.save();

      return res.json({
        success: true,
        message: "Dummy shipment cancelled locally",
      });
    }

    const token = await getShiprocketToken();

    if (shipment?.awb) {
      const response = await axios.post(
        "https://apiv2.shiprocket.in/v1/external/orders/cancel/shipment/awbs",
        { awbs: [shipment.awb] },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // console.log('response.data', response.data)
      const message = response?.data?.message?.toLowerCase()

      if (response?.data?.status === 200 || message?.includes("cancel")) {
        // console.log("Cancelling")
        shipment.status = "Cancelled";
        order.deliveryStatus = "Cancelled";
        await order.save();

        return res.json({
          success: true,
          message: "Shipment cancelled successfully",
          awb: shipment.awb,
        });
      }

      return res.status(400).json({
        success: false,
        message: response?.data?.message || "Failed to cancel shipment",
      });
    }

    else if (shipment?.shiprocketOrderId) {
      const response = await axios.post(
        "https://apiv2.shiprocket.in/v1/external/orders/cancel",
        { ids: [shipment.shiprocketOrderId] },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      // console.log('response.data for shiprocket id', response.data)
      if (response?.data?.status_code === 200) {
        shipment.status = "Cancelled";
        order.deliveryStatus = "Cancelled";
        await order.save();

        return res.json({
          success: true,
          message: "Order cancelled successfully in Shiprocket",
        });
      }

      return res.status(400).json({
        success: false,
        message: response?.data?.message || "Failed to cancel order",
      });
    }

    return res.status(400).json({
      success: false,
      message: "No Shiprocket order or shipment found to cancel",
    });

  } catch (error) {
    console.error("Cancel failed:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || "Cancel failed",
    });
  }
};


const trackShipmentByOrderId = async (req, res) => {
  try {
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required",
      });
    }

    const order = await Order.findById(orderId);
    if (!order || !order.shipment?.awb) {
      return res.status(404).json({
        success: false,
        message: "Order or AWB not found",
      });
    }

    const awb = order.shipment.awb;

    if (awb.startsWith("DUMMY")) {
      return res.json({
        success: true,
        message: "Dummy AWB, no real tracking available",
        awb,
        status: "AWB Pending / Dummy",
        history: [],
      });
    }

    const token = await getShiprocketToken();

    const response = await axios.get(
      `https://apiv2.shiprocket.in/v1/external/courier/track/shipment/${awb}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // console.log('resonse', response.data)

    return res.json({
      success: true,
      awb,
      courier: response.data.data?.courier_name,
      status: response.data.data?.current_status,
      history: response.data.data?.shipment_track || [],
    });

  } catch (error) {
    console.error("Track shipment failed:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || "Failed to track shipment",
    });
  }
};

// const requestBulkPickup = async () => {
//   const orders = await Order.find({
//     "shipment.readyToShip": true,
//     "shipment.pickupRequested": false,
//     "shipment.shipmentId": { $exists: true }
//   });

//   if (orders.length === 0) return;

//   const shipmentIds = orders.map(o => o.shipment.shipmentId);

//   const token = await getShiprocketToken();

//   await axios.post(
//     "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup",
//     { shipment_id: shipmentIds },
//     { headers: { Authorization: `Bearer ${token}` } }
//   );

//   await Order.updateMany(
//     { _id: { $in: orders.map(o => o._id) } },
//     {
//       $set: {
//         "shipment.pickupRequested": true,
//         "shipment.pickupRequestedAt": new Date(),
//         "shipment.status": "Pickup Scheduled"
//       }
//     }
//   );
// };

// const requestBulkPickup = async () => {
//   const orders = await Order.find({
//     "shipment.readyToShip": true,
//     "shipment.pickupRequested": false,
//     "shipment.shipmentId": { $exists: true }
//   });

//   if (!orders.length) return;

//   const shipmentIds = orders.map(o => o.shipment.shipmentId);
//   const token = await getShiprocketToken();

//   const pickupDate = dayjs()
//   .add(1, "day")
//   .format("YYYY-MM-DD");

//   console.log('pickupDate', pickupDate)

//   try {
//     await axios.post(
//       "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup",
//       { shipment_id: shipmentIds, pickup_date: [pickupDate] },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json"
//         }
//       }
//     );

//     await Order.updateMany(
//       {
//         _id: { $in: orders.map(o => o._id) },
//         "shipment.pickupRequested": false
//       },
//       {
//         $set: {
//           "shipment.pickupRequested": true,
//           "shipment.pickupRequestedAt": new Date(),
//           "shipment.status": "Pickup Scheduled"
//         }
//       }
//     );

//     console.log("✅ Bulk pickup scheduled successfully");

//   } catch (err) {
//     console.error(
//       "❌ Bulk pickup failed:",
//       err.response?.data || err.message
//     );
//   }
// };


// const requestBulkPickup = async () => {
//   const orders = await Order.find({
//     "shipment.pickupRequested": false,
//     "shipment.shipmentId": { $exists: true }
//   });

//   if (!orders.length) return console.log("No shipments to schedule");

//   const token = await getShiprocketToken();
//   const pickupDate = dayjs().add(1, "day").format("YYYY-MM-DD");

//   console.log("pickupDate", pickupDate);

//   for (let order of orders) {
//     const shipmentId = order.shipment.shipmentId;

//     try {
//       const response = await axios.post(
//         "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup",
//         { shipment_id: [shipmentId], pickup_date: [pickupDate] },
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json"
//           }
//         }
//       );

//       if (response?.data?.status_code === 200) {
//         // Success – update this order only
//         await Order.updateOne(
//           { _id: order._id },
//           {
//             $set: {
//               "shipment.pickupRequested": true,
//               "shipment.pickupRequestedAt": new Date(),
//               "shipment.readyToShip": true, 
//               "shipment.status": "Pickup Scheduled"
//             }
//           }
//         );
//         console.log(`✅ Pickup scheduled for shipmentId: ${shipmentId}`);
//       } else {
//         console.warn(
//           `⚠️ Failed to schedule pickup for shipmentId ${shipmentId}:`,
//           response?.data?.message
//         );
//       }
//     } catch (err) {
//       console.error(
//         `❌ Error scheduling pickup for shipmentId ${shipmentId}:`,
//         err.response?.data || err.message
//       );
//     }
//   }

//   console.log("Bulk pickup process completed");
// };

const requestBulkPickup = async () => {
  console.log('running bulk pickup')
  const orders = await Order.find({
    "shipment.pickupRequested": false,
    "shipment.shipmentId": { $exists: true }
  }).sort({ createdAt: -1 })

  console.log('orders', orders[0])
  console.log('orders', orders[1])

  if (!orders.length) return console.log("No shipments to schedule");

  const token = await getShiprocketToken();
  const pickupDate = dayjs().add(2, "day").format("YYYY-MM-DD");

  console.log("pickupDate", pickupDate);

  for (let order of orders) {
    const shipmentId = order.shipment.shipmentId;

    try {
      const response = await axios.post(
        "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup",
        { shipment_id: [shipmentId], pickup_date: [pickupDate] },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response?.data?.status_code === 200) {
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              "shipment.pickupRequested": true,
              "shipment.pickupRequestedAt": new Date(),
              "shipment.readyToShip": true,
              "shipment.status": "Pickup Scheduled"
            }
          }
        );
        console.log(`✅ Pickup scheduled for shipmentId: ${shipmentId}`);
      } else {
        console.warn(
          `⚠️ Failed to schedule pickup for shipmentId ${shipmentId}:`,
          response,
          response?.data?.message
        );
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;

      if (
        err.response?.data?.status_code === 400 &&
        errMsg.includes("Already in Pickup Queue")
      ) {
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              "shipment.pickupRequested": true,
              "shipment.pickupRequestedAt": new Date(),
              "shipment.readyToShip": true,
              "shipment.status": "Pickup Scheduled"
            }
          }
        );
        console.log(
          `ℹ️ Pickup already scheduled in Shiprocket, marking as requested for shipmentId: ${shipmentId}`
        );
      } else {
        console.log(
          `❌ Error scheduling pickup for shipmentId ${shipmentId}:`,
          errMsg
        );
      }
    }
  }

  console.log("Bulk pickup process completed");
};


const requestPickupForOrder = async (req, res) => {
  try {
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!order.shipment?.shipmentId) {
      return res.status(400).json({
        success: false,
        message: "Shipment not created for this order",
      });
    }

    if (!order.shipment.readyToShip) {
      return res.status(400).json({
        success: false,
        message: "Order is not marked as Ready to Ship",
      });
    }

    if (order.shipment.pickupRequested) {
      return res.status(400).json({
        success: false,
        message: "Pickup already requested for this order",
      });
    }

    const token = await getShiprocketToken();

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup",
      {
        shipment_id: [order.shipment.shipmentId],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data?.pickup_status) {
      return res.status(400).json({
        success: false,
        message: "Pickup request failed",
        data: response.data,
      });
    }

    order.shipment.pickupRequested = true;
    order.shipment.pickupRequestedAt = new Date();
    order.shipment.status = "Pickup Scheduled";

    await order.save();

    return res.json({
      success: true,
      message: "Pickup requested successfully",
      pickupStatus: response.data.pickup_status,
      orderId,
      shipmentId: order.shipment.shipmentId,
    });

  } catch (error) {
    console.error(
      "Pickup request failed:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.message || "Failed to request pickup",
    });
  }
};

const getServiceableCouriers = asyncHandler(async (req, res) => {
  const {
    pickupPincode = "226003",
    deliveryPincode,
    shiprocketOrderId,
    paymentMethod
  } = req.body;
  // console.log("running get servicable couriers")
  // console.log("req.body", req.body)
  if (!pickupPincode || !deliveryPincode || !shiprocketOrderId) {
    return res.status(400).json({
      success: false,
      message: "pickupPincode, deliveryPincode and shiprocketOrderId are required"
    });
  }
  // const pincodes = await PinCode.find({}).lean();
  // const zips = pincodes.map((item) => item.zip);

  // if (zips.includes(deliveryPincode)) {
  //   return res.status(400).json({
  //     success: false,
  //     serviceable: false,
  //     message: "COD not available for this pincode"
  //   });
  // }

  const token = await getShiprocketToken();
  const cod = paymentMethod === "COD" ? 1 : 0;

  const params = {
    pickup_postcode: pickupPincode,
    delivery_postcode: deliveryPincode,
    order_id: shiprocketOrderId,
    cod
  };

  const response = await axios.get(
    "https://apiv2.shiprocket.in/v1/external/courier/serviceability",
    {
      headers: { Authorization: `Bearer ${token}` },
      params
    }
  );

  const apiData = response.data;

  if (!apiData?.data) {
    return res.json({
      success: true,
      serviceable: false,
      message: apiData?.message || "Not serviceable"
    });
  }

  const rawCouriers  = apiData.data.available_courier_companies;
  // console.log("rawCouriers ", rawCouriers )

  if (!Array.isArray(rawCouriers ) || rawCouriers .length === 0) {
    return res.json({
      success: true,
      serviceable: false,
      message: "No couriers available for this shipment"
    });
  }

  const couriers = rawCouriers.map((c) => ({
    id: c.courier_company_id,
    name: c.courier_name,
    price: c.rate,
    etd: c.etd || null, 
  }));

  return res.status(200).json({
    success: true,
    serviceable: true,
    couriers
  })

})

module.exports = {
  checkServiceability, calculateShippingCost, createWarehouse, getWarehouses, deleteWarehouse,
  createShiprocketShipment, createShiprocketOrderTest, generateAWB, createShiprocketShipmentForOrder,
  cancelShiprocketOrder, cancelShiprocketAWBs, cancelShipmentByOrderId, trackShipmentByOrderId,
  requestBulkPickup, requestPickupForOrder, calculateShippingForOrder, getServiceableCouriers
};
