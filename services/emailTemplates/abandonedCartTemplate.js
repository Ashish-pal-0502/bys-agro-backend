const abandonedCartTemplate = (nameToUse, products) => {

  const productHTML = products.map(p => `
  <tr>
    <td style="padding: 15px 0; border-bottom: 1px solid #eee;">
      <table width="100%">
        <tr>
          <td width="90">
            <img src="${p.images?.[0]}" 
                 alt="${p.name}" 
                 width="80" 
                 height="80"
                 style="border-radius:10px; object-fit:cover;" />
          </td>
          <td style="padding-left:10px;">
            <p style="margin:0; font-size:15px; font-weight:600; color:#222;">
              ${p.name}
            </p>
            <p style="margin:2px 0; font-size:13px; color:#555;">
              Qty: ${p.quantity}
            </p>
            <p style="margin:4px 0; font-size:13px; color:#777;">
              ${p.weight || ''}
            </p>
            <p style="margin:4px 0; font-size:14px; font-weight:bold; color:#27ae60;">
              ₹${p.price}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
`).join('');

  return `
  <div style="background:#f5f7f9; padding:30px 10px; font-family:Arial, sans-serif;">
    
    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden;">

      <!-- HEADER -->
      <div style="background:#27ae60; padding:20px; text-align:center;">
        <h1 style="color:white; margin:0; font-size:22px;">
          Motherland Pure
        </h1>
      </div>

      <!-- BODY -->
      <div style="padding:25px;">
        
        <h2 style="margin-top:0; font-size:20px; color:#2c3e50;">
          Your cart is waiting 🛒
        </h2>

        <p style="color:#555; font-size:14px;">
          Hi ${nameToUse},
        </p>

        <p style="color:#666; font-size:14px;">
          Looks like you left some items in your cart. They're still available — grab them before they’re gone!
        </p>

        <!-- PRODUCTS -->
        <table width="100%" style="margin-top:20px;">
          ${productHTML}
        </table>

        <!-- CTA -->
        <div style="text-align:center; margin:30px 0;">
          <a href="https://motherlandpure.com/cart"
             style="background:#27ae60; color:white; padding:14px 28px; text-decoration:none; border-radius:6px; font-weight:bold; font-size:14px;">
             Complete Your Order
          </a>
        </div>

        <p style="font-size:13px; color:#777;">
          Need help? Just reply to this email — we're happy to assist you.
        </p>

      </div>

      <!-- FOOTER -->
      <div style="background:#fafafa; padding:20px; text-align:center;">
        <p style="margin:0; font-size:12px; color:#999;">
          © 2026 Motherland Pure
        </p>
        <p style="margin:5px 0 0; font-size:12px; color:#aaa;">
          www.motherlandpure.com
        </p>
      </div>

    </div>
  </div>
  `;
};

module.exports = abandonedCartTemplate;