import type { Lang } from "@/lib/i18n-context";

export type HelpRoleId =
  | "customer"
  | "cashier"
  | "barista"
  | "manager"
  | "owner"
  | "platform_admin";

export interface HelpTopic {
  key: string;
  title: { vi: string; en: string };
  steps: { vi: string[]; en: string[] };
  image?: string;
}

export interface HelpRole {
  id: HelpRoleId;
  label: { vi: string; en: string };
  intro: { vi: string; en: string };
  topics: HelpTopic[];
}

const img = (role: HelpRoleId, key: string) =>
  `${import.meta.env.BASE_URL}help-images/${role}/${key}.png`;

export const HELP_ROLES: HelpRole[] = [
  {
    id: "customer",
    label: { vi: "Khách hàng", en: "Customer" },
    intro: {
      vi: "Hướng dẫn dành cho khách mua hàng trên web VComm Store, gọi món tại bàn và quản lý tài khoản cá nhân.",
      en: "Guide for shoppers using VComm Store web storefront, table ordering and personal account.",
    },
    topics: [
      {
        key: "register-login",
        title: { vi: "Đăng ký và đăng nhập", en: "Register & sign in" },
        steps: {
          vi: [
            "Vào trang chủ, bấm nút Đăng ký ở góc trên bên phải.",
            "Điền họ tên, số điện thoại, mật khẩu và xác nhận đăng ký.",
            "Lần sau quay lại bấm Đăng nhập rồi nhập số điện thoại + mật khẩu.",
            "Quên mật khẩu? Bấm liên kết \"Quên mật khẩu\" trên màn hình đăng nhập để đặt lại.",
          ],
          en: [
            "Open the home page and click Register at the top right.",
            "Fill in your name, phone, password and confirm registration.",
            "On return visits, click Sign In and enter your phone + password.",
            "Forgot password? Click \"Forgot password\" on the login screen to reset.",
          ],
        },
        image: img("customer", "register-login"),
      },
      {
        key: "browse-shop",
        title: { vi: "Tìm cửa hàng và sản phẩm", en: "Browse shops & products" },
        steps: {
          vi: [
            "Trang chủ liệt kê các cửa hàng gần bạn — chọn bán kính (1/5/7/10/20 km hoặc tự nhập).",
            "Bấm vào một cửa hàng để xem ảnh, mô tả, danh mục và toàn bộ sản phẩm.",
            "Dùng ô tìm kiếm để lọc sản phẩm theo tên (không phân biệt dấu).",
            "Bấm vào sản phẩm để thêm vào giỏ; điều chỉnh số lượng ngay tại danh sách.",
          ],
          en: [
            "Home page lists nearby stores — pick a radius (1/5/7/10/20 km or custom).",
            "Tap a store to see photos, description, categories and the full product list.",
            "Use the search box to filter products by name (diacritic-insensitive).",
            "Click a product to add to cart; adjust quantity directly in the list.",
          ],
        },
        image: img("customer", "browse-shop"),
      },
      {
        key: "checkout",
        title: { vi: "Đặt hàng và thanh toán", en: "Checkout" },
        steps: {
          vi: [
            "Mở giỏ hàng, kiểm tra sản phẩm và số lượng.",
            "Chọn mã khuyến mãi áp dụng (có thể chọn nhiều mã được phép xếp chồng).",
            "Điền địa chỉ giao hàng hoặc chọn nhận tại cửa hàng, ghi chú nếu có.",
            "Chọn phương thức thanh toán (tiền mặt khi nhận hàng hoặc chuyển khoản VietQR) và xác nhận.",
          ],
          en: [
            "Open the cart, review items and quantities.",
            "Pick promotion codes (multiple stackable codes are allowed).",
            "Enter delivery address or choose pickup at store, add note if needed.",
            "Pick payment method (COD or VietQR transfer) and confirm.",
          ],
        },
        image: img("customer", "checkout"),
      },
      {
        key: "table-ordering",
        title: { vi: "Gọi món tại bàn bằng QR", en: "Table ordering via QR" },
        steps: {
          vi: [
            "Quét QR trên bàn bằng camera điện thoại để mở trang gọi món của bàn đó.",
            "Chọn món và số lượng, áp khuyến mãi nếu có rồi gửi đơn.",
            "Có thể gọi thêm nhiều lượt — các đơn cộng dồn lại trên cùng bàn.",
            "Khi cần thanh toán, gọi nhân viên — họ sẽ thu tổng các đơn của bàn.",
          ],
          en: [
            "Scan the table QR with your phone camera to open that table's ordering page.",
            "Pick items and quantities, apply promo if any, then submit the order.",
            "You can place multiple rounds — orders accumulate on the same table.",
            "When ready to pay, call the staff — they will check out all orders for the table.",
          ],
        },
        image: img("customer", "table-ordering"),
      },
      {
        key: "account-orders",
        title: { vi: "Quản lý đơn hàng và điểm thưởng", en: "Orders & loyalty points" },
        steps: {
          vi: [
            "Vào mục Tài khoản > Đơn hàng để xem lịch sử và trạng thái đơn.",
            "Bấm vào đơn để xem chi tiết, yêu cầu hoàn / đổi nếu đủ điều kiện.",
            "Mục Khuyến mãi hiển thị điểm tích lũy (1 điểm cho mỗi 100.000đ chi tiêu).",
            "Bấm Đổi điểm để quy đổi toàn bộ điểm sang mã giảm giá riêng (1 điểm = 1.000đ).",
          ],
          en: [
            "Go to Account > Orders to view history and status.",
            "Click an order for details; request return/exchange if eligible.",
            "Promotions tab shows your loyalty points (1 point per 100,000 VND spent).",
            "Tap Redeem to convert all points into a personal discount code (1 point = 1,000 VND).",
          ],
        },
        image: img("customer", "account-orders"),
      },
      {
        key: "profile",
        title: { vi: "Cập nhật hồ sơ và ảnh đại diện", en: "Profile & avatar" },
        steps: {
          vi: [
            "Vào Tài khoản > Hồ sơ để chỉnh tên, số điện thoại, địa chỉ.",
            "Bấm ảnh đại diện để chụp ảnh khuôn mặt bằng camera (tự động bắt khi căn giữa).",
            "Đổi mật khẩu định kỳ trong cùng trang để bảo vệ tài khoản.",
          ],
          en: [
            "Go to Account > Profile to edit name, phone, address.",
            "Click your avatar to capture a face photo with the camera (auto when centered).",
            "Change password regularly on the same page to keep your account safe.",
          ],
        },
        image: img("customer", "profile"),
      },
    ],
  },

  {
    id: "cashier",
    label: { vi: "Thu ngân", en: "Cashier" },
    intro: {
      vi: "Hướng dẫn dùng màn hình POS để bán hàng trực tiếp tại quầy và xử lý đơn online.",
      en: "Guide to using the POS screen for in-store sales and handling online orders.",
    },
    topics: [
      {
        key: "open-shift",
        title: { vi: "Mở ca làm việc", en: "Open a shift" },
        steps: {
          vi: [
            "Vào menu Ca làm việc, bấm Mở ca và nhập số tiền đầu ca trong két.",
            "Mỗi đơn bán sẽ tự gắn vào ca đang mở của bạn.",
            "Cuối ca bấm Đóng ca, đếm tiền cuối ca và đối chiếu với báo cáo.",
          ],
          en: [
            "Go to Shifts menu, click Open shift and enter the opening cash amount.",
            "Every sale will be attached to your currently open shift.",
            "At end of shift click Close shift, count the cash drawer and reconcile with the report.",
          ],
        },
        image: img("cashier", "open-shift"),
      },
      {
        key: "pos-sale",
        title: { vi: "Bán hàng tại quầy (POS)", en: "Make a sale at the counter" },
        steps: {
          vi: [
            "Mở màn hình Bán hàng (POS). Tìm sản phẩm bằng tên hoặc mã SKU; có thể quét mã vạch.",
            "Chọn số lượng, áp khuyến mãi nếu khách có, hoặc nhập giảm giá tay trong khung Giảm giá.",
            "Chọn khách hàng (hoặc Khách lẻ), chọn phương thức thanh toán (tiền mặt / chuyển khoản VietQR).",
            "Bấm Thanh toán để hoàn tất đơn và in / gửi hóa đơn cho khách.",
          ],
          en: [
            "Open the POS screen. Find products by name or SKU; you can scan a barcode.",
            "Set quantity, apply promo codes if the customer has any, or enter a manual discount in the Discount panel.",
            "Pick a customer (or Walk-in), choose payment method (cash / VietQR transfer).",
            "Click Pay to complete the sale and print / send the receipt to the customer.",
          ],
        },
        image: img("cashier", "pos-sale"),
      },
      {
        key: "table-checkout",
        title: { vi: "Phục vụ bàn và thu tiền", en: "Dine-in tables & checkout" },
        steps: {
          vi: [
            "Vào mục Bàn tại chỗ — bàn có khách sẽ hiển thị số đơn chưa thanh toán và tổng tạm tính.",
            "Bấm vào bàn để xem chi tiết các đơn (cả đơn khách tự gọi qua QR).",
            "Có thể gộp nhiều bàn (chuột phải > Gộp bàn) khi nhóm khách ngồi nhiều bàn.",
            "Khi khách trả tiền, chọn phương thức thanh toán và bấm Thanh toán cả bàn — bàn sẽ tự được giải phóng.",
          ],
          en: [
            "Open Tables — occupied tables show unpaid order count and running total.",
            "Click a table to see all orders (including those self-ordered by QR).",
            "You can merge tables (right-click > Merge) when a group of guests occupies several tables.",
            "When guests pay, pick the payment method and click Check out — the entire table group is freed.",
          ],
        },
        image: img("cashier", "table-checkout"),
      },
      {
        key: "online-orders",
        title: { vi: "Xử lý đơn online", en: "Process online orders" },
        steps: {
          vi: [
            "Vào Đơn hàng để xem các đơn từ web / app gửi vào.",
            "Bấm Xác nhận khi sẵn sàng chuẩn bị, sau đó cập nhật trạng thái Đang giao / Hoàn tất.",
            "Đơn cần đổi hoặc hoàn tiền sẽ xuất hiện trong mục Hoàn / Đổi hàng để xử lý.",
          ],
          en: [
            "Open Orders to see incoming web / app orders.",
            "Click Confirm when ready to prepare, then update to Shipping / Completed.",
            "Refund or exchange requests appear in the Returns/Exchanges menu for processing.",
          ],
        },
        image: img("cashier", "online-orders"),
      },
      {
        key: "customer-display",
        title: { vi: "Màn hình khách thứ hai", en: "Customer-facing display" },
        steps: {
          vi: [
            "Bật chức năng \"Màn hình khách\" trên POS để mở cửa sổ phụ kéo sang màn hình thứ hai.",
            "Cửa sổ này hiển thị giỏ hàng và tổng tiền theo thời gian thực cho khách xem.",
            "Khi thanh toán bằng VietQR, mã QR sẽ tự xuất hiện trên màn hình khách để khách quét.",
          ],
          en: [
            "Enable \"Customer display\" on the POS to pop a second window onto another monitor.",
            "It shows the live cart and totals for the customer to see.",
            "When paying via VietQR, the QR code appears on the customer display for scanning.",
          ],
        },
        image: img("cashier", "customer-display"),
      },
    ],
  },

  {
    id: "barista",
    label: { vi: "Pha chế / Bếp", en: "Barista / Kitchen" },
    intro: {
      vi: "Hướng dẫn cho nhân viên pha chế và bếp dùng màn hình KDS để xử lý món.",
      en: "Guide for baristas and kitchen staff using the KDS screen to process drinks and dishes.",
    },
    topics: [
      {
        key: "kds",
        title: { vi: "Màn hình KDS đơn hàng", en: "KDS order screen" },
        steps: {
          vi: [
            "Vào Đơn hàng để thấy danh sách các đơn cần pha chế / chuẩn bị.",
            "Mỗi đơn hiển thị danh sách món, ghi chú khách hàng (ít đường, không đá…), số bàn hoặc mã đơn.",
            "Bấm Bắt đầu khi nhận làm, bấm Hoàn tất khi món xong để báo nhân viên phục vụ.",
          ],
          en: [
            "Open Orders to see the queue of orders to prepare.",
            "Each order shows items, customer notes (less sugar, no ice…), table or order code.",
            "Click Start when you pick it up, click Complete when finished to notify the floor staff.",
          ],
        },
        image: img("barista", "kds"),
      },
      {
        key: "ingredient-check",
        title: { vi: "Kiểm tra nguyên liệu", en: "Check ingredient stock" },
        steps: {
          vi: [
            "Mở Tồn kho > Nguyên liệu để xem số lượng tồn hiện tại của từng nguyên liệu.",
            "Hệ thống tự trừ nguyên liệu theo công thức khi đơn pha chế hoàn tất.",
            "Báo quản lý khi nguyên liệu sắp hết để kịp đặt hàng.",
          ],
          en: [
            "Open Inventory > Ingredients to see current stock for each ingredient.",
            "The system auto-deducts ingredients per recipe when a beverage order completes.",
            "Notify the manager when an ingredient is running low so they can reorder.",
          ],
        },
        image: img("barista", "ingredient-check"),
      },
    ],
  },

  {
    id: "manager",
    label: { vi: "Cửa hàng trưởng", en: "Store manager" },
    intro: {
      vi: "Hướng dẫn cho quản lý một cửa hàng: nhân sự, tồn kho, nhập hàng, chi phí và báo cáo cấp cửa hàng.",
      en: "Guide for a single-store manager: staff, inventory, stock receipts, expenses and store-level reports.",
    },
    topics: [
      {
        key: "staff-shifts",
        title: { vi: "Quản lý nhân viên và ca làm", en: "Staff & shifts" },
        steps: {
          vi: [
            "Vào Nhân viên để thêm thu ngân / pha chế, gán cửa hàng và phân quyền.",
            "Vào Ca làm việc để xem ai đang trực, doanh thu theo ca và đối chiếu tiền cuối ca.",
            "Có thể đổi mật khẩu nhân viên khi cần và buộc đăng xuất phiên hiện tại.",
          ],
          en: [
            "Open Staff to add cashiers / baristas, assign store and roles.",
            "Open Shifts to see who is on duty, per-shift revenue and reconcile end-of-shift cash.",
            "You can reset a staff password when needed and revoke their current session.",
          ],
        },
        image: img("manager", "staff-shifts"),
      },
      {
        key: "stock-receipt",
        title: { vi: "Nhập kho từ nhà cung cấp", en: "Receive stock from suppliers" },
        steps: {
          vi: [
            "Vào Nhập kho > Tạo phiếu, chọn nhà cung cấp.",
            "Quét mã vạch hoặc nhập SKU để thêm sản phẩm — số lượng tự gợi ý theo quy cách (1 thùng = N gói).",
            "Nhập giá nhập, ghi chú và lưu phiếu — tồn kho và giá vốn cập nhật ngay.",
          ],
          en: [
            "Open Stock receipts > Create, pick the supplier.",
            "Scan barcode or enter SKU to add items — quantity auto-suggests by conversion rate (1 case = N packs).",
            "Enter purchase price, notes and save — stock and cost update immediately.",
          ],
        },
        image: img("manager", "stock-receipt"),
      },
      {
        key: "products",
        title: { vi: "Quản lý sản phẩm và công thức", en: "Products & recipes" },
        steps: {
          vi: [
            "Vào Sản phẩm để thêm / chỉnh sản phẩm. Phân loại Đồ uống / Hàng hóa / Dịch vụ đúng để hệ thống xử lý tồn kho chính xác.",
            "Có thể chuyển giữa hai chế độ xem Bảng và Thẻ ở góc thanh lọc.",
            "Với đồ uống: bấm menu \"Công thức\" để khai báo nguyên liệu và định lượng từng món.",
            "Tải ảnh sản phẩm để hiển thị trên web / POS đẹp hơn.",
          ],
          en: [
            "Open Products to add / edit items. Set the right type (Beverage / Grocery / Service) so inventory is handled correctly.",
            "Switch between Table and Card views from the toggle in the filter bar.",
            "For beverages: open the Recipe action to declare ingredients and quantity per drink.",
            "Upload product photos so the web / POS look great.",
          ],
        },
        image: img("manager", "products"),
      },
      {
        key: "expenses",
        title: { vi: "Ghi chi phí vận hành", en: "Record operating expenses" },
        steps: {
          vi: [
            "Vào Chi phí, bấm Thêm chi phí, chọn danh mục (điện, nước, thuê nhà, marketing…).",
            "Nhập số tiền, ngày, ghi chú và đính kèm hóa đơn nếu cần.",
            "Báo cáo \"Thu chi theo tháng\" sẽ tổng hợp doanh thu và chi phí giúp đánh giá lãi/lỗ.",
          ],
          en: [
            "Open Expenses, click Add, pick a category (electricity, water, rent, marketing…).",
            "Enter amount, date, note and attach the invoice if needed.",
            "The monthly P&L report aggregates revenue vs expenses to evaluate profit / loss.",
          ],
        },
        image: img("manager", "expenses"),
      },
      {
        key: "tables-config",
        title: { vi: "Cấu hình bàn và mã QR", en: "Configure tables & QR codes" },
        steps: {
          vi: [
            "Vào Bàn tại chỗ > Quản lý bàn để thêm bàn, đổi tên / sức chứa.",
            "Bấm In QR để in mã QR dán lên bàn — khách quét sẽ vào ngay trang gọi món của bàn đó.",
            "Có thể gộp / tách bàn từ trang quản lý hoặc trực tiếp ở màn hình POS.",
          ],
          en: [
            "Open Tables > Manage to add tables, rename / set capacity.",
            "Click Print QR to print the QR sticker for each table — customers scan to open the table-ordering page.",
            "Merge / split tables from the management page or directly on the POS screen.",
          ],
        },
        image: img("manager", "tables-config"),
      },
      {
        key: "reports",
        title: { vi: "Xem báo cáo cửa hàng", en: "Store reports" },
        steps: {
          vi: [
            "Vào Báo cáo để xem doanh thu theo ngày, theo nhân viên, theo sản phẩm bán chạy.",
            "Lọc theo khoảng thời gian, xuất Excel khi cần báo cáo cho chủ.",
            "Đối chiếu với báo cáo ca làm việc để phát hiện chênh lệch tiền mặt.",
          ],
          en: [
            "Open Reports to see revenue by day, by staff and by best-selling product.",
            "Filter by date range, export to Excel when needed.",
            "Cross-check with shift reports to spot cash discrepancies.",
          ],
        },
        image: img("manager", "reports"),
      },
    ],
  },

  {
    id: "owner",
    label: { vi: "Chủ chuỗi", en: "Chain owner" },
    intro: {
      vi: "Hướng dẫn dành cho chủ doanh nghiệp / chủ chuỗi nhiều cửa hàng — toàn quyền cấu hình hệ thống.",
      en: "Guide for the business owner / multi-store chain owner — full system configuration access.",
    },
    topics: [
      {
        key: "stores",
        title: { vi: "Tạo và quản lý các cửa hàng", en: "Create & manage stores" },
        steps: {
          vi: [
            "Vào Cửa hàng > Thêm cửa hàng, nhập tên, địa chỉ, vị trí (lat/lng), giờ mở cửa.",
            "Tải nhiều ảnh và viết mô tả — sẽ hiển thị trên trang công khai cho khách.",
            "Chọn cửa hàng đang xem từ ô \"Chọn cửa hàng\" trên thanh công cụ; chọn \"Tất cả cửa hàng\" để xem hợp nhất.",
            "Có thể tạm ngưng hoạt động cửa hàng mà không mất dữ liệu.",
          ],
          en: [
            "Open Stores > Add store, enter name, address, location (lat/lng), business hours.",
            "Upload multiple photos and write a description — these appear on the public storefront.",
            "Switch the active store from the toolbar selector; pick \"All stores\" for a consolidated view.",
            "You can temporarily deactivate a store without losing its data.",
          ],
        },
        image: img("owner", "stores"),
      },
      {
        key: "users-roles",
        title: { vi: "Tài khoản và phân quyền", en: "Accounts & permissions" },
        steps: {
          vi: [
            "Vào Tài khoản để mời quản lý / thu ngân / pha chế và gán cửa hàng cho từng người.",
            "Mỗi vai trò có quyền khác nhau — Chủ chuỗi xem được tất cả, Quản lý chỉ xem cửa hàng được gán.",
            "Có thể đặt lại mật khẩu, vô hiệu hóa hoặc kích hoạt lại tài khoản bất cứ lúc nào.",
          ],
          en: [
            "Open Accounts to invite managers / cashiers / baristas and assign stores to each.",
            "Each role has different permissions — Owner sees everything, Manager only sees their assigned store.",
            "You can reset passwords, disable or re-enable accounts at any time.",
          ],
        },
        image: img("owner", "users-roles"),
      },
      {
        key: "promotions",
        title: { vi: "Khuyến mãi và mã giảm giá", en: "Promotions & discount codes" },
        steps: {
          vi: [
            "Vào Khuyến mãi để tạo chương trình: giảm theo %, giảm cố định, mua N tặng M, miễn phí ship…",
            "Cấu hình mã, ngày bắt đầu / kết thúc, giới hạn lượt dùng, áp dụng cho cửa hàng nào.",
            "Có thể bật \"Tự phát hành\" để mỗi khách hàng tự nhận một mã riêng khi đăng ký.",
            "Theo dõi lượt dùng trong tab Sử dụng để đo hiệu quả từng chương trình.",
          ],
          en: [
            "Open Promotions to create campaigns: % off, fixed amount, buy N get M, free ship…",
            "Set the code, start / end date, usage limits, eligible stores.",
            "Toggle \"Auto-issue\" so each customer receives a unique private code on registration.",
            "Track usage in the Usage tab to measure each campaign.",
          ],
        },
        image: img("owner", "promotions"),
      },
      {
        key: "suppliers-ingredients",
        title: { vi: "Nhà cung cấp và nguyên liệu", en: "Suppliers & ingredients" },
        steps: {
          vi: [
            "Vào Nhà cung cấp để khai báo các đối tác cấp hàng — dùng khi tạo phiếu nhập kho.",
            "Vào Nguyên liệu để khai báo nguyên liệu pha chế và đơn vị tồn (ml, g, ly...).",
            "Trong sản phẩm Đồ uống, mở Công thức để liên kết nguyên liệu — mỗi ly bán ra sẽ trừ tự động.",
          ],
          en: [
            "Open Suppliers to record your vendors — used when creating stock receipts.",
            "Open Ingredients to declare beverage ingredients and stock units (ml, g, cup...).",
            "On a Beverage product, open Recipe to link ingredients — each sale auto-deducts them.",
          ],
        },
        image: img("owner", "suppliers-ingredients"),
      },
      {
        key: "reports-overview",
        title: { vi: "Báo cáo toàn chuỗi", en: "Chain-wide reports" },
        steps: {
          vi: [
            "Tổng quan hiển thị doanh thu, đơn hàng, top sản phẩm, top cửa hàng theo khoảng thời gian chọn.",
            "Vào Báo cáo để so sánh giữa các cửa hàng và phân tích lãi / lỗ.",
            "Báo cáo Khách hàng cho biết khách trung thành, chi tiêu trung bình, điểm tích lũy.",
          ],
          en: [
            "Dashboard shows revenue, orders, top products and top stores by date range.",
            "Open Reports to compare stores and analyze P&L.",
            "The Customer report shows loyal customers, average spend and accumulated points.",
          ],
        },
        image: img("owner", "reports-overview"),
      },
      {
        key: "vat-payments",
        title: { vi: "Hóa đơn VAT và thanh toán VietQR", en: "VAT invoices & VietQR" },
        steps: {
          vi: [
            "Vào Hóa đơn VAT để cấu hình mẫu hóa đơn và phát hành cho đơn cần xuất VAT.",
            "Vào Cửa hàng > tài khoản ngân hàng để khai số tài khoản — hệ thống sẽ tạo VietQR động cho từng đơn.",
            "Có thể tạo QR tĩnh để thu ngân in dán quầy cho khách quét.",
          ],
          en: [
            "Open VAT invoices to configure templates and issue invoices for orders that require VAT.",
            "In Stores > bank account, enter account info — the system will generate dynamic VietQR per order.",
            "You can also generate a static QR for cashiers to print at the counter.",
          ],
        },
        image: img("owner", "vat-payments"),
      },
    ],
  },

  {
    id: "platform_admin",
    label: { vi: "Quản trị nền tảng", en: "Platform admin" },
    intro: {
      vi: "Hướng dẫn cho đội vận hành nền tảng VComm Store — quản lý toàn bộ chủ chuỗi và khách hàng trên hệ thống.",
      en: "Guide for the VComm Store platform operations team — manage all chain owners and customers on the system.",
    },
    topics: [
      {
        key: "owners-subscription",
        title: { vi: "Quản lý chủ chuỗi và gói dịch vụ", en: "Manage owners & subscriptions" },
        steps: {
          vi: [
            "Vào Quản trị > danh sách chủ chuỗi để xem trạng thái thuê bao của từng tài khoản.",
            "Có thể gia hạn, tạm khóa hoặc kích hoạt lại tài khoản chủ chuỗi.",
            "Khi tài khoản hết hạn, hệ thống tự khóa truy cập quản lý cho đến khi gia hạn.",
          ],
          en: [
            "Open Admin > Owners to see each account's subscription state.",
            "Extend, suspend or re-activate a chain owner account.",
            "When a subscription expires, management access is auto-locked until renewed.",
          ],
        },
        image: img("platform_admin", "owners-subscription"),
      },
      {
        key: "customers",
        title: { vi: "Quản lý khách hàng", en: "Manage customers" },
        steps: {
          vi: [
            "Vào Khách hàng để tìm kiếm, sắp xếp, xem chi tiết hồ sơ và lịch sử đơn của từng khách.",
            "Có thể tạm khóa, kích hoạt lại hoặc đặt lại mật khẩu cho khách khi họ yêu cầu hỗ trợ.",
          ],
          en: [
            "Open Customers to search, sort, view detailed profile and order history per customer.",
            "Suspend, re-activate or reset password for a customer when they need support.",
          ],
        },
        image: img("platform_admin", "customers"),
      },
      {
        key: "platform-promotions",
        title: { vi: "Khuyến mãi cấp nền tảng", en: "Platform-level promotions" },
        steps: {
          vi: [
            "Vào Khuyến mãi (admin) để tạo các mã áp dụng toàn nền tảng cho mọi cửa hàng.",
            "Theo dõi tab Lượt dùng để đo hiệu quả của từng mã.",
            "Mã đổi điểm khách hàng (DIEM…) tự sinh khi khách bấm đổi điểm — chỉ riêng khách đó dùng được.",
          ],
          en: [
            "Open Promotions (admin) to create platform-wide codes valid across all stores.",
            "Track the Usage tab to measure effectiveness.",
            "Customer point-redemption codes (DIEM…) are auto-issued when a customer redeems points — usable only by that customer.",
          ],
        },
        image: img("platform_admin", "platform-promotions"),
      },
      {
        key: "admin-settings",
        title: { vi: "Tài khoản cá nhân admin", en: "Personal admin account" },
        steps: {
          vi: [
            "Vào Cài đặt để chỉnh chủ đề màu, hồ sơ và mật khẩu của chính mình.",
            "Đổi mật khẩu sẽ tự đăng xuất các phiên khác để bảo vệ an toàn.",
          ],
          en: [
            "Open Settings to change theme, your profile and your password.",
            "Changing password automatically signs out other sessions for safety.",
          ],
        },
        image: img("platform_admin", "admin-settings"),
      },
    ],
  },
];

export function pickHelpText<T>(value: { vi: T; en: T }, lang: Lang): T {
  return value[lang];
}
