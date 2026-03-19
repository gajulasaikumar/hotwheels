const STORE_WHATSAPP_NUMBER = "919999999999";
const SHIPPING_FLAT_FEE = 120;
const FREE_SHIPPING_THRESHOLD = 3500;
const PAGE_SIZE = 12;
const CART_STORAGE_KEY = "hot_wheels_cart_v1";

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
const chips = Array.from(document.querySelectorAll(".chip"));
let toastTimer = null;

function formatPrice(value) {
  return `Rs ${value.toLocaleString("en-IN")}`;
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
    const disabled = item.stock <= 0 ? "disabled" : "";
    const buttonLabel = item.stock <= 0 ? "Sold Out" : "Add to Cart";
    const warnClass = item.stock <= 2 ? "warn" : "";
    return `
      <article class="product-card">
        <a class="product-link" href="product.html?id=${item.id}">
          <img loading="lazy" decoding="async" src="${item.image}" alt="${item.name}">
        </a>
        <div class="product-body">
          <p class="stock ${warnClass}">${item.category} | ${stockText(item.stock)}</p>
          <h3><a class="product-link" href="product.html?id=${item.id}">${item.name}</a></h3>
          <p class="meta">${item.brand} | ${item.condition}</p>
          <div class="product-foot">
            <span class="price">${formatPrice(item.price)}</span>
            <button class="btn-add" data-id="${item.id}" ${disabled}>${buttonLabel}</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  loadMoreBtn.style.display = filtered.length > list.length ? "inline-flex" : "none";

  productGrid.querySelectorAll("button[data-id]").forEach((button) => {
    button.addEventListener("click", () => addToCart(Number(button.dataset.id)));
  });
}

function renderNewArrivals() {
  const arrivals = products.filter((item) => item.isNew).slice(0, 4);
  newArrivalGrid.innerHTML = arrivals.map((item) => `
    <article class="tile">
      <h4>${item.name}</h4>
      <p>${item.category} | ${formatPrice(item.price)}</p>
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
  const product = products.find((item) => item.id === productId);
  if (!product || product.stock <= 0) return;

  const found = state.cart.find((item) => item.productId === productId);
  if (found) {
    if (found.qty >= product.stock) {
      alert("Only limited stock available for this model.");
      return;
    }
    found.qty += 1;
  } else {
    state.cart.push({ productId, qty: 1 });
  }
  saveCartToStorage();
  renderCart();
  showAddToCartToast(product.name);
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((item) => item.productId !== productId);
  saveCartToStorage();
  renderCart();
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

function renderCart() {
  const summary = cartSummary();
  const qty = summary.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = summary.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FLAT_FEE : 0;
  const total = subtotal + shipping;

  cartCount.textContent = String(qty);
  cartSubtotal.textContent = formatPrice(subtotal);
  shippingFee.textContent = formatPrice(shipping);
  cartTotal.textContent = formatPrice(total);

  if (!summary.length) {
    cartItems.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }

  cartItems.innerHTML = summary.map((item) => `
    <article class="cart-item">
      <h4>${item.name}</h4>
      <p>${item.qty} x ${formatPrice(item.price)} = ${formatPrice(item.lineTotal)}</p>
      <button data-remove-id="${item.id}">Remove</button>
    </article>
  `).join("");

  cartItems.querySelectorAll("button[data-remove-id]").forEach((button) => {
    button.addEventListener("click", () => removeFromCart(Number(button.dataset.removeId)));
  });
}

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  overlay.hidden = false;
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
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
  toastText.textContent = `${name} added to cart`;
  cartToast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    cartToast.hidden = true;
  }, 2600);
}

function checkoutOnWhatsApp() {
  const summary = cartSummary();
  if (!summary.length) {
    alert("Cart is empty.");
    return;
  }

  const subtotal = summary.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FLAT_FEE : 0;
  const total = subtotal + shipping;
  const lines = summary.map((item) => `- ${item.name} | Qty: ${item.qty} | ${formatPrice(item.lineTotal)}`);
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
}

async function loadProducts() {
  try {
    const response = await fetch("./products.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load products.json");
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error("Invalid products data");
    products = data;
  } catch (error) {
    products = fallbackProducts;
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
