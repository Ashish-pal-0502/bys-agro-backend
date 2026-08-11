const mapStatus = (status) => {
  if (!status) return "Processing";

  if (status.includes("Delivered")) return "Delivered";
  if (status.includes("Out For Delivery")) return "Out for Delivery";
  if (status.includes("Cancelled")) return "Cancelled";

  return "Processing";
};

module.exports = mapStatus;