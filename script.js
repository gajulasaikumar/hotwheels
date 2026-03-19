const STORE_WHATSAPP_NUMBER = "917013266345";
const SHIPPING_FLAT_FEE = 120;
const FREE_SHIPPING_THRESHOLD = 3500;
const PAGE_SIZE = 12;
const CART_STORAGE_KEY = "hot_wheels_cart_v1";
const EXCEL_FILE_PATH = "./inventory.xlsx";
const JSON_FILE_PATH = "./products.json";
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=900&q=80";

let products = [];

const fallbackProducts = [
  { id: 1, name: "Nissan Skyline GT-R R34", brand: "Hot Wheels", category: "Premium", price: 1499, condition: "Carded Mint", stock: 3, isNew: true, image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=900&q=80" },
  { id: 2, name: "Toyota Supra MK4", brand: "Hot Wheels", category: "Mainline", price: 699, condition: "Carded Mint", stock: 7, isNew: true, image: "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80" },
  { id: 3, name: "Porsche 911 GT3 RS", brand: "Hot Wheels", category: "Boulevard", price: 1299, condition: "Near Mint", stock: 4, isNew: false, image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=900&q=80" },
  { id: 4, name: "Lamborghini Huracan Team Transport", brand: "Hot Wheels", category: "Team Transport", price: 1799, condition: "Carded Mint", stock: 2, isNew: true, image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=900&q=80" },
  { id: 5, name: "Super Treasure Hunt Camaro", brand: "Hot Wheels", category: "Treasure Hunt", price: 2299, condition: "Carded Mint", stock: 1, isNew: false, image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80" },
  { id: 6, name: "Mazda RX-7", brand: "Hot Wheels", category: "Premium", price: 1399, condition: "Carded Mint", stock: 3, isNew: true, image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=900&q=80" },
  { id: 7, name: "Ford Mustang GT", brand: "Matchbox", category: "Mainline", price: 499, condition: "Carded Good", stock: 6, isNew: false, image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=80" },
  { id: 8, name: "Nissan GTR R35", brand: "Mini GT", category: "Premium", price: 1999, condition: "Carded Mint", stock: 2, isNew: true, image: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=900&q=80" }
];

const state = {
  query: "",
  category: "all",
  brand: "all",
  availability: "all",
  sort: "featured",
  priceFrom: "",
  priceTo: "",
  visibleCount: PAGE_SIZE,
  cart: []
};

const productGrid = document.getElementById("productGrid");
const newArrivalGrid = document.getElementById("newArrivalGrid");
const brandGrid = document.getElementById("brandGrid");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const brandFilter = document.getElementById("brandFilter");
const availabilityFilter = document.getElementById("availabilityFilter");
const sortSelect = document.getElementById("sortSelect");
const priceFromInput = document.getElementById("priceFromInput");
const priceToInput = document.getElementById("priceToInput");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const resultsInfo = document.getElementById("resultsInfo");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const cartCount = document.getElementById("cartCount");
const cartSubtotal = document.getElementById("cartSubtotal");
const shippingFee = document.getElementById("shippingFee");
const cartTotal = document.getElementById("cartTotal");
const cartItems = document.getElementById("cartItems");
const cartDrawer = document.getElementById("cartDrawer");
const overlay = document.getElementById("overlay");
const cartToast = document.getElementById("cartToast");
const toastText = document.getElementById("toastText");
const floatingCartBtn = document.getElementById("floatingCartBtn");
const floatingCartCount = document.getElementById("floatingCartCount");
const chips = Array.from(document.querySelectorAll(".chip"));
let toastTimer = null;

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function valueFromAliases(row, aliases) {
  const normalized = {};
  Object.keys(row).forEach((key) => {
    normalized[normalizeKey(key)] = row[key];
  });

  for (const alias of aliases) {
    const found = normalized[normalizeKey(alias)];
    if (found !== undefined && String(found).trim() !== "") return found;
  }
  return "";
}

function parsePrice(raw) {
  const cleaned = String(raw || "").replace(/[^0-9.]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function parseStock(raw) {
  const cleaned = String(raw || "").replace(/[^0-9-]/g, "");
  const value = Number.parseInt(cleaned, 10);
  return Number.isFinite(value) ? value : 0;
}

function parseBool(raw) {
  const text = String(raw || "").trim().toLowerCase();
  return ["true", "yes", "y", "1", "new", "latest"].includes(text);
}

function parseDiscount(raw, mrp, salePrice) {
  const cleaned = String(raw || "").replace(/[^0-9.]/g, "");
  const direct = Number(cleaned);
  if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
  if (mrp > salePrice && salePrice > 0) {
    return Math.round(((mrp - salePrice) / mrp) * 100);
  }
  return 0;
}

function normalizeProduct(raw, index) {
  const name = String(valueFromAliases(raw, ["name", "title", "model", "car", "itemname", "productname"])).trim();
  const brand = String(valueFromAliases(raw, ["brand", "make", "manufacturer"])).trim() || "Hot Wheels";
  const category = String(valueFromAliases(raw, ["category", "series", "type", "line"])).trim() || "Mainline";
  const condition = String(valueFromAliases(raw, ["condition", "cardcondition"])).trim() || "Carded Good";
  const image1 = String(valueFromAliases(raw, ["image", "imageurl", "pic", "photo", "url"])).trim();
  const image2 = String(valueFromAliases(raw, ["image2", "pic2", "photo2"])).trim();
  const image3 = String(valueFromAliases(raw, ["image3", "pic3", "photo3"])).trim();
  const idRaw = valueFromAliases(raw, ["id", "sku", "productid"]);
  const priceRaw = valueFromAliases(raw, ["price", "sellingprice", "saleprice", "amount"]);
  const mrpRaw = valueFromAliases(raw, ["mrp", "originalprice", "listprice"]);
  const stockRaw = valueFromAliases(raw, ["stock", "quantity", "qty", "available"]);
  const isNewRaw = valueFromAliases(raw, ["isnew", "new", "latest"]);
  const discountRaw = valueFromAliases(raw, ["discount", "discountpercent", "off"]);
  const sku = String(valueFromAliases(raw, ["sku", "itemcode", "code", "productcode"])).trim();
  const scale = String(valueFromAliases(raw, ["scale", "size"])).trim();
  const year = String(valueFromAliases(raw, ["year", "modelyear"])).trim();
  const color = String(valueFromAliases(raw, ["color", "colour"])).trim();
  const series = String(valueFromAliases(raw, ["series", "set", "collection"])).trim();
  const material = String(valueFromAliases(raw, ["material"])).trim();
  const description = String(valueFromAliases(raw, ["description", "details", "about", "notes"])).trim();

  const id = Number.parseInt(String(idRaw), 10);
  const salePrice = parsePrice(priceRaw);
  const mrpPrice = parsePrice(mrpRaw);
  const finalPrice = salePrice > 0 ? salePrice : mrpPrice;

  return {
    id: Number.isFinite(id) ? id : index + 1,
    name,
    brand,
    category,
    price: finalPrice,
    mrp: mrpPrice,
    discountPercent: parseDiscount(discountRaw, mrpPrice, finalPrice),
    condition,
    stock: parseStock(stockRaw),
    isNew: parseBool(isNewRaw),
    image: image1 || PLACEHOLDER_IMAGE,
    images: [image1, image2, image3].filter(Boolean),
    sku,
    scale,
    year,
    color,
    series,
    material,
    description
  };
}

function mapRowToProduct(row, index) {
  return normalizeProduct(row, index);
}

function formatPrice(value) {
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function productMetaLine(item) {
  return [item.brand, item.series, item.scale].filter(Boolean).join(" | ");
}

function productSpecsLine(item) {
  const specs = [];
  if (item.sku) specs.push(`SKU: ${item.sku}`);
  return specs.join(" | ");
}

function renderPriceBlock(item) {
  const showMrp = Number(item.mrp) > Number(item.price);
  const showDiscount = Number(item.discountPercent) > 0;
  return `
    <div class="price-block">
      <div class="price-row">
        <span class="price">${formatPrice(item.price)}</span>
      </div>
      <div class="price-meta">
        ${showMrp ? `<span class="old-price">${formatPrice(item.mrp)}</span>` : ""}
        ${showDiscount ? `<span class="discount-pill">${item.discountPercent}% OFF</span>` : ""}
      </div>
    </div>
  `;
}

function cartQtyForProduct(productId) {
  const found = state.cart.find((item) => item.productId === productId);
  return found ? found.qty : 0;
}

function renderProductAction(item, qty) {
  const disabled = item.stock <= 0 ? "disabled" : "";
  if (qty > 0) {
    return `
      <div class="qty-control">
        <button class="qty-btn" data-qty-dec="${item.id}">-</button>
        <span class="qty-num">${qty}</span>
        <button class="qty-btn" data-qty-inc="${item.id}" ${qty >= item.stock ? "disabled" : ""}>+</button>
      </div>
    `;
  }
  return `<button class="btn-add" data-cart-add="${item.id}" ${disabled}>${item.stock <= 0 ? "Sold Out" : "Add to Cart"}</button>`;
}

function bindProductActionEvents(scope = productGrid) {
  scope.querySelectorAll("button[data-cart-add]").forEach((button) => {
    button.addEventListener("click", () => addToCart(Number(button.dataset.cartAdd)));
  });

  scope.querySelectorAll("button[data-qty-inc]").forEach((button) => {
    button.addEventListener("click", () => adjustCartQty(Number(button.dataset.qtyInc), 1));
  });

  scope.querySelectorAll("button[data-qty-dec]").forEach((button) => {
    button.addEventListener("click", () => adjustCartQty(Number(button.dataset.qtyDec), -1));
  });
}

function updateProductCardQtyUI(productId) {
  const card = productGrid.querySelector(`[data-product-id="${productId}"]`);
  if (!card) return;
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  const productFoot = card.querySelector(".product-foot");
  if (!productFoot) return;
  const qty = cartQtyForProduct(productId);
  productFoot.innerHTML = `${renderPriceBlock(product)}${renderProductAction(product, qty)}`;
  bindProductActionEvents(productFoot);
}

function setActiveChip(category) {
  chips.forEach((chip) => chip.classList.toggle("active", chip.dataset.chip === category));
}

function resetVisibleCount() {
  state.visibleCount = PAGE_SIZE;
}

function initFilters() {
  const categories = [...new Set(products.map((p) => p.category))];
  categoryFilter.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.append(option);
  });

  const brands = [...new Set(products.map((p) => p.brand))];
  brandFilter.innerHTML = '<option value="all">All Brands</option>';
  brands.forEach((brand) => {
    const option = document.createElement("option");
    option.value = brand;
    option.textContent = brand;
    brandFilter.append(option);
  });
}

function getVisibleProducts() {
  let filtered = products.filter((item) => {
    const byQuery = `${item.name} ${item.brand}`.toLowerCase().includes(state.query.toLowerCase());
    const byCategory = state.category === "all" || item.category === state.category;
    const byBrand = state.brand === "all" || item.brand === state.brand;
    const byAvailability =
      state.availability === "all" ||
      (state.availability === "in-stock" && item.stock > 0) ||
      (state.availability === "sold-out" && item.stock <= 0);
    const byMin = state.priceFrom === "" || item.price >= Number(state.priceFrom);
    const byMax = state.priceTo === "" || item.price <= Number(state.priceTo);
    return byQuery && byCategory && byBrand && byAvailability && byMin && byMax;
  });

  if (state.sort === "price-low") filtered = filtered.sort((a, b) => a.price - b.price);
  if (state.sort === "price-high") filtered = filtered.sort((a, b) => b.price - a.price);
  if (state.sort === "name-az") filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (state.sort === "name-za") filtered = filtered.sort((a, b) => b.name.localeCompare(a.name));

  return filtered;
}

function stockText(stock) {
  if (stock <= 0) return "Sold out";
  if (stock <= 2) return `Low stock: ${stock}`;
  return `In stock: ${stock}`;
}

function renderProducts() {
  const filtered = getVisibleProducts();
  const list = filtered.slice(0, state.visibleCount);
  resultsInfo.textContent = `${filtered.length} products | Showing ${list.length}`;

  if (!list.length) {
    productGrid.innerHTML = "<p>No products found with this filter.</p>";
    loadMoreBtn.style.display = "none";
    return;
  }

  productGrid.innerHTML = list.map((item) => {
    const warnClass = item.stock <= 2 ? "warn" : "";
    const specsLine = productSpecsLine(item);
    const qty = cartQtyForProduct(item.id);
    return `
      <article class="product-card" data-product-id="${item.id}">
        <a class="product-link" href="product.html?id=${item.id}">
          <img loading="lazy" decoding="async" src="${item.image || PLACEHOLDER_IMAGE}" alt="${item.name}">
        </a>
        <div class="product-body">
          <p class="stock ${warnClass}">${item.category} | ${stockText(item.stock)}</p>
          <h3><a class="product-link" href="product.html?id=${item.id}">${item.name}</a></h3>
          <p class="meta">${productMetaLine(item) || item.brand}</p>
          ${specsLine ? `<p class="meta small">${specsLine}</p>` : ""}
          ${item.description ? `<p class="meta desc">${item.description}</p>` : ""}
          <p class="meta">${item.condition}</p>
          <div class="product-foot">
            ${renderPriceBlock(item)}
            ${renderProductAction(item, qty)}
          </div>
        </div>
      </article>
    `;
  }).join("");

  loadMoreBtn.style.display = filtered.length > list.length ? "inline-flex" : "none";
  bindProductActionEvents(productGrid);
}

function renderNewArrivals() {
  const arrivals = products.filter((item) => item.isNew).slice(0, 4);
  newArrivalGrid.innerHTML = arrivals.map((item) => `
    <article class="tile">
      <h4>${item.name}</h4>
      <p>${item.brand} | ${item.category}</p>
      <p>${formatPrice(item.price)}</p>
    </article>
  `).join("");
}

function renderBrands() {
  const brands = [...new Set(products.map((item) => item.brand))];
  brandGrid.innerHTML = brands.map((brand) => {
    const count = products.filter((item) => item.brand === brand).length;
    return `
      <button class="tile brand-tile" data-brand="${brand}">
        <h4>${brand}</h4>
        <p>${count} products</p>
      </button>
    `;
  }).join("");

  brandGrid.querySelectorAll("button[data-brand]").forEach((button) => {
    button.addEventListener("click", () => {
      state.brand = button.dataset.brand;
      brandFilter.value = state.brand;
      resetVisibleCount();
      renderProducts();
      document.getElementById("hotwheels").scrollIntoView({ behavior: "smooth" });
    });
  });
}

function addToCart(productId) {
  adjustCartQty(productId, 1, true);
}

function removeFromCart(productId) {
  setCartQty(productId, 0);
}

function setCartQty(productId, targetQty, showToast = false) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  if (targetQty > product.stock) {
    alert("Only limited stock available for this model.");
  }

  const qty = Math.max(0, Math.min(targetQty, product.stock));
  const existingIndex = state.cart.findIndex((item) => item.productId === productId);

  if (qty === 0) {
    if (existingIndex >= 0) state.cart.splice(existingIndex, 1);
  } else if (existingIndex >= 0) {
    state.cart[existingIndex].qty = qty;
  } else {
    state.cart.push({ productId, qty });
  }

  saveCartToStorage();
  renderCart();
  updateProductCardQtyUI(productId);

  if (showToast && qty > 0) {
    showAddToCartToast(product.name);
  }
}

function adjustCartQty(productId, delta, showToast = false) {
  const existing = state.cart.find((item) => item.productId === productId);
  const currentQty = existing ? existing.qty : 0;
  setCartQty(productId, currentQty + delta, showToast);
}

function saveCartToStorage() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
}

function hydrateCartFromStorage() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) state.cart = parsed;
  } catch (error) {
    state.cart = [];
  }
}

function cartSummary() {
  return state.cart.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return { ...product, qty: item.qty, lineTotal: product.price * item.qty };
  });
}

function computeCartTotals(summary) {
  const qty = summary.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = summary.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FLAT_FEE : 0;
  const total = subtotal + shipping;
  return { qty, subtotal, shipping, total };
}

function updateFloatingCart(qty) {
  if (!floatingCartBtn || !floatingCartCount) return;
  floatingCartCount.textContent = `${qty} item${qty === 1 ? "" : "s"}`;
  const showBar = qty > 0 && !cartDrawer.classList.contains("open");
  floatingCartBtn.hidden = !showBar;
  floatingCartBtn.style.display = showBar ? "" : "none";
}

function renderCart() {
  const summary = cartSummary();
  const { qty, subtotal, shipping, total } = computeCartTotals(summary);
  const previousScrollTop = cartItems.scrollTop;

  cartCount.textContent = String(qty);
  cartSubtotal.textContent = formatPrice(subtotal);
  shippingFee.textContent = formatPrice(shipping);
  cartTotal.textContent = formatPrice(total);
  updateFloatingCart(qty);

  if (!summary.length) {
    cartItems.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }

  cartItems.innerHTML = summary.map((item) => `
    <article class="cart-item">
      <h4>${item.name}${item.sku ? ` (${item.sku})` : ""}</h4>
      <p>${item.qty} x ${formatPrice(item.price)} = ${formatPrice(item.lineTotal)}</p>
      <div class="cart-line-controls">
        <div class="qty-control">
          <button class="qty-btn" data-cart-dec="${item.id}">-</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" data-cart-inc="${item.id}" ${item.qty >= item.stock ? "disabled" : ""}>+</button>
        </div>
        <button class="cart-remove-btn" data-remove-id="${item.id}">Remove</button>
      </div>
    </article>
  `).join("");

  cartItems.querySelectorAll("button[data-cart-inc]").forEach((button) => {
    button.addEventListener("click", () => adjustCartQty(Number(button.dataset.cartInc), 1));
  });

  cartItems.querySelectorAll("button[data-cart-dec]").forEach((button) => {
    button.addEventListener("click", () => adjustCartQty(Number(button.dataset.cartDec), -1));
  });

  cartItems.querySelectorAll("button[data-remove-id]").forEach((button) => {
    button.addEventListener("click", () => removeFromCart(Number(button.dataset.removeId)));
  });

  cartItems.scrollTop = previousScrollTop;
}

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
  overlay.hidden = false;
  if (floatingCartBtn) floatingCartBtn.hidden = true;
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-open");
  overlay.hidden = true;
  const summary = cartSummary();
  const { qty } = computeCartTotals(summary);
  updateFloatingCart(qty);
}

function openCartIfRequested() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("openCart") === "1") {
    openCart();
  }
}

function openWhatsAppOrder(prefillText) {
  window.open(`https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${prefillText}`, "_blank");
}

function showAddToCartToast(name) {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  cartToast.hidden = true;
}

function checkoutOnWhatsApp() {
  const summary = cartSummary();
  if (!summary.length) {
    alert("Cart is empty.");
    return;
  }

  const { subtotal, shipping, total } = computeCartTotals(summary);
  const lines = summary.map((item) => {
    const sku = item.sku ? ` | SKU: ${item.sku}` : "";
    return `- ${item.name}${sku} | Qty: ${item.qty} | ${formatPrice(item.lineTotal)}`;
  });
  const message =
    `Hi, I want to order these Hot Wheels:%0A%0A${lines.join("%0A")}` +
    `%0A%0ASubtotal: ${formatPrice(subtotal)}` +
    `%0AShipping: ${formatPrice(shipping)}` +
    `%0ATotal: ${formatPrice(total)}` +
    `%0A%0AName:%0APhone:%0AAddress:%0APincode:`;

  openWhatsAppOrder(message);
}

function bindEvents() {
  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    resetVisibleCount();
    renderProducts();
  });

  categoryFilter.addEventListener("change", (event) => {
    state.category = event.target.value;
    setActiveChip(state.category);
    resetVisibleCount();
    renderProducts();
  });

  brandFilter.addEventListener("change", (event) => {
    state.brand = event.target.value;
    resetVisibleCount();
    renderProducts();
  });

  availabilityFilter.addEventListener("change", (event) => {
    state.availability = event.target.value;
    resetVisibleCount();
    renderProducts();
  });

  sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    resetVisibleCount();
    renderProducts();
  });

  priceFromInput.addEventListener("input", (event) => {
    state.priceFrom = event.target.value.trim();
    resetVisibleCount();
    renderProducts();
  });

  priceToInput.addEventListener("input", (event) => {
    state.priceTo = event.target.value.trim();
    resetVisibleCount();
    renderProducts();
  });

  clearFiltersBtn.addEventListener("click", () => {
    state.query = "";
    state.category = "all";
    state.brand = "all";
    state.availability = "all";
    state.sort = "featured";
    state.priceFrom = "";
    state.priceTo = "";
    searchInput.value = "";
    categoryFilter.value = "all";
    brandFilter.value = "all";
    availabilityFilter.value = "all";
    sortSelect.value = "featured";
    priceFromInput.value = "";
    priceToInput.value = "";
    setActiveChip("all");
    resetVisibleCount();
    renderProducts();
  });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      state.category = chip.dataset.chip;
      categoryFilter.value = state.category;
      setActiveChip(state.category);
      resetVisibleCount();
      renderProducts();
      document.getElementById("hotwheels").scrollIntoView({ behavior: "smooth" });
    });
  });

  loadMoreBtn.addEventListener("click", () => {
    state.visibleCount += PAGE_SIZE;
    renderProducts();
  });

  document.getElementById("openCartBtn").addEventListener("click", openCart);
  document.getElementById("closeCartBtn").addEventListener("click", closeCart);
  document.getElementById("checkoutBtn").addEventListener("click", checkoutOnWhatsApp);
  document.getElementById("toastViewCartBtn").addEventListener("click", () => {
    cartToast.hidden = true;
    openCart();
  });
  document.getElementById("toastCloseBtn").addEventListener("click", () => {
    cartToast.hidden = true;
  });
  document.getElementById("contactWhatsAppBtn").addEventListener("click", () => {
    openWhatsAppOrder("Hi, I need help selecting Hot Wheels models.");
  });
  overlay.addEventListener("click", closeCart);

  if (floatingCartBtn) {
    floatingCartBtn.addEventListener("click", openCart);
  }

  window.addEventListener("resize", () => {
    const summary = cartSummary();
    const { qty } = computeCartTotals(summary);
    updateFloatingCart(qty);
  });
}

async function loadProducts() {
  if (typeof XLSX !== "undefined") {
    try {
      const excelResponse = await fetch(EXCEL_FILE_PATH, { cache: "no-store" });
      if (excelResponse.ok) {
        const buffer = await excelResponse.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });
        const mapped = rows
          .map((row, index) => mapRowToProduct(row, index))
          .filter((item) => item.name && Number.isFinite(item.price));
        if (mapped.length) {
          products = mapped;
          return;
        }
      }
    } catch (error) {
      // Continue to JSON fallback if Excel is not found or invalid.
    }
  }

  try {
    const response = await fetch(JSON_FILE_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load products.json");
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error("Invalid products data");
    products = data.map((item, index) => normalizeProduct(item, index));
  } catch (error) {
    products = fallbackProducts.map((item, index) => normalizeProduct(item, index));
  }
}

async function init() {
  await loadProducts();
  hydrateCartFromStorage();
  initFilters();
  bindEvents();
  renderProducts();
  renderNewArrivals();
  renderBrands();
  renderCart();
  openCartIfRequested();
}

init();
