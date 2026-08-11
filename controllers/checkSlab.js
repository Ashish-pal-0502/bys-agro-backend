const getWeightSlab = (weight) => {
  if (weight <= 250) return 250;
  if (weight <= 500) return 500;
  return null
};

const expandOrderItems = (orderItems) => {
  const expanded = [];

  for (const item of orderItems) {
    const qty = item.qty || 1;

    for (let i = 0; i < qty; i++) {
      expanded.push({
        ...item,
        qty: 1,              
        originalQty: qty      
      });
    }
  }

  return expanded;
};

function groupOrderItemsForShipping(orderItems) {
  const splitItems = [];

  for (const item of orderItems) {
    for (let i = 0; i < item.qty; i++) {
      splitItems.push({
        ...item,
        qty: 1
      });
    }
  }

  splitItems.sort((a, b) => {
    if (a.isCombo !== b.isCombo) {
      return a.isCombo ? 1 : -1;
    }
    return a.weight - b.weight;
  });

  const parcels = [];

  for (let i = 0; i < splitItems.length; i += 2) {
    const items = splitItems.slice(i, i + 2);

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

    let baseItem = items[0];

    for (const item of items) {
      if (item.weight > baseItem.weight) {
        baseItem = item;
      }
    }

    parcels.push({
      items,
      totalWeight,
      totalWidth: baseItem.width * items.length,
      totalHeight: baseItem.height,
      totalLength: baseItem.length
    });
  }

  return parcels;
}

function createSingleParcel(orderItems) {
  const boxDimensions = {
    2: { width: 10, height: 18, length: 20 },
    5: { width: 20, height: 18, length: 20 }
  };

  let totalQty = 0;
  let totalWeight = 0;

  for (const item of orderItems) {
    totalQty += item.qty;
    totalWeight += item.weight * item.qty;
  }

  let totalWidth;
  let totalHeight;
  let totalLength;

  if (totalQty === 1) {
    const item = orderItems[0];
    totalWidth = item.width;
    totalHeight = item.height;
    totalLength = item.length;

  } else if (totalQty === 2) {
    const box = boxDimensions[2];
    totalWidth = box.width;
    totalHeight = box.height;
    totalLength = box.length;

  } else {
    const box = boxDimensions[5];
    totalWidth = box.width;
    totalHeight = box.height;
    totalLength = box.length;
  }

  return {
    orderItems,
    totalQty,
    totalWeight,
    totalWidth,
    totalHeight,
    totalLength
  };
}



const getDeliveryInfo = (totalPrice, courierCost, paymentMethod) => {
  let delivery = false;
  let message = null;

  if(paymentMethod === "COD") {
     message = 'COD not applicable'
     return {
      delivery,
      message
     }
  }

  if (totalPrice >= 500 && totalPrice < 1000 && courierCost <= 100) {
    delivery = true;
    message = `Your total value ₹${totalPrice} qualifies for free delivery.`;
  } 
  else if (totalPrice >= 1000 && courierCost <= 150) {
    delivery = true;
    message = `Your total value ₹${totalPrice} qualifies for free delivery.`;
  }

  return { delivery, message };
};


module.exports = {
    getWeightSlab,
    groupOrderItemsForShipping,
    getDeliveryInfo,
    expandOrderItems,
    createSingleParcel
}