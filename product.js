const CART_STORAGE_KEY = "hot_wheels_cart_v1";
const PRODUCT_DATA_PATH = "./products.json";

const fallbackProducts = [
  { id: 1, name: "Nissan Skyline GT-R R34", brand: "Hot Wheels", category: "Premium", price: 1499, condition: "Carded Mint", stock: 3, image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=900&q=80" },
  { id: 2, name: "Toyota Supra MK4", brand: "Hot Wheels", category: "Mainline", price: 699, condition: "Carded Mint", stock: 7, image: "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80" },
  { id: 3, name: "Porsche 911 GT3 RS", brand: "Hot Wheels", category: "Boulevard", price: 1299, condition: "Near Mint", stock: 4, image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=900&q=80" }
];

const productDetail = document.getElementById("productDetail");
const relatedGrid = document.getElementById("relatedGrid");
const detailToast = document.getElementById("detailToast");
const detailToastText = document.getElementById("detailToastText");

function formatPrice(value) {
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function getProductIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

function readCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function addToCart(product) {
  if (product.stock <= 0) return;
  const cart = readCart();
  const found = cart.find((item) => item.productId === product.id);
  if (found) {
    if (found.qty >= product.stock) {
      alert("Only limited stock available.");
      return;
    }
    found.qty += 1;
  } else {
    cart.push({ productId: product.id, qty: 1 });
  }
  saveCart(cart);
  detailToastText.textContent = `${product.name} added to cart`;
  detailToast.hidden = false;
  setTimeout(() => {
    detailToast.hidden = true;
  }, 2400);
}

function renderProduct(product) {
  const buttonDisabled = product.stock <= 0 ? "disabled" : "";
  const stockText = product.stock <= 0 ? "Sold Out" : `In stock: ${product.stock}`;
  productDetail.innerHTML = `
    <article class="detail-card">
      <div class="detail-image-wrap">
        <img src="${product.image}" alt="${product.name}">
      </div>
      <div class="detail-info">
        <p class="eyebrow">${product.category}</p>
        <h1>${product.name}</h1>
        <p class="meta">${product.brand} | ${product.condition}</p>
        <p class="detail-stock">${stockText}</p>
        <p class="detail-price">${formatPrice(product.price)}</p>
        <div class="hero-actions">
          <button id="detailAddBtn" class="btn-primary" ${buttonDisabled}>Add to Cart</button>
          <a class="btn-secondary" href="index.html#hotwheels">Continue Shopping</a>
        </div>
      </div>
    </article>
  `;

  const addBtn = document.getElementById("detailAddBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => addToCart(product));
  }
}

function renderRelated(products, currentProduct) {
  const related = products
    .filter((item) => item.id !== currentProduct.id && item.category === currentProduct.category)
    .slice(0, 4);

  if (!related.length) {
    relatedGrid.innerHTML = "<p>No related products found.</p>";
    return;
  }

  relatedGrid.innerHTML = related
    .map((item) => `
      <a href="product.html?id=${item.id}" class="tile product-link">
        <h4>${item.name}</h4>
        <p>${item.category} | ${formatPrice(item.price)}</p>
      </a>
    `)
    .join("");
}

async function loadProducts() {
  try {
    const response = await fetch(PRODUCT_DATA_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error("Cannot load products");
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error("Invalid products data");
    return data;
  } catch {
    return fallbackProducts;
  }
}

async function init() {
  const products = await loadProducts();
  const productId = getProductIdFromQuery();
  const selected = products.find((item) => item.id === productId) || products[0];
  if (!selected) {
    productDetail.innerHTML = "<p>Product not found.</p>";
    return;
  }
  renderProduct(selected);
  renderRelated(products, selected);
}

init();
