// Global Variables
let currentUser = null
let books = []
let filteredBooks = []
let currentPage = 1
const booksPerPage = 12
let currentGenre = ""
let backgroundMusic = null
let isMusicPlaying = false

// Genre Music Mapping
const genreMusic = {
  fiction: "classicMusic",
  mystery: "mysteryMusic",
  romance: "romanceMusic",
  "science-fiction": "scifiMusic",
  fantasy: "classicMusic",
  biography: "classicMusic",
  history: "classicMusic",
  science: "scifiMusic",
  philosophy: "classicMusic",
  poetry: "classicMusic",
}

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
  setupEventListeners()
  loadBooks()
  checkAuthState()
})

// Initialize Application
function initializeApp() {
  // Set theme from localStorage
  const savedTheme = localStorage.getItem("theme") || "light"
  document.documentElement.setAttribute("data-theme", savedTheme)
  updateThemeIcon(savedTheme)

  // Initialize music
  setupBackgroundMusic()

  // Setup intersection observer for animations
  setupIntersectionObserver()
}

// Setup Event Listeners
function setupEventListeners() {
  // Navigation
  document.getElementById("mobileMenuToggle").addEventListener("click", toggleMobileMenu)
  document.getElementById("themeToggle").addEventListener("click", toggleTheme)
  document.getElementById("musicToggle").addEventListener("click", toggleMusic)
  document.getElementById("authBtn").addEventListener("click", openAuthModal)

  // Search and Filter
  document.getElementById("searchInput").addEventListener("input", debounce(handleSearch, 300))
  document.getElementById("genreFilter").addEventListener("change", handleGenreFilter)
  document.getElementById("languageFilter").addEventListener("change", handleLanguageFilter)
  document.getElementById("voiceSearch").addEventListener("click", startVoiceSearch)

  // View Toggle
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", handleViewToggle)
  })

  // Load More
  document.getElementById("loadMoreBtn").addEventListener("click", loadMoreBooks)

  // Upload Form
  setupUploadForm()

  // Auth Form
  setupAuthForm()

  // OTP Inputs
  setupOTPInputs()

  // Payment
  setupPaymentHandlers()

  // Keyboard Navigation
  document.addEventListener("keydown", handleKeyboardNavigation)

  // Close modals on outside click
  document.addEventListener("click", handleOutsideClick)
}

// Setup Background Music
function setupBackgroundMusic() {
  // Create audio elements for different genres (using placeholder URLs)
  const musicTracks = {
    classicMusic: "https://www.soundjay.com/misc/sounds/classical-music.mp3",
    mysteryMusic: "https://www.soundjay.com/misc/sounds/mystery-music.mp3",
    romanceMusic: "https://www.soundjay.com/misc/sounds/romantic-music.mp3",
    scifiMusic: "https://www.soundjay.com/misc/sounds/scifi-music.mp3",
  }

  // Since we can't use actual audio files, we'll simulate music control
  console.log("Background music system initialized")
}

// Toggle Background Music
function toggleMusic() {
  const musicBtn = document.getElementById("musicToggle")
  const icon = musicBtn.querySelector("i")

  isMusicPlaying = !isMusicPlaying

  if (isMusicPlaying) {
    icon.className = "fas fa-volume-up"
    playGenreMusic(currentGenre)
    showToast("Background music enabled", "success")
  } else {
    icon.className = "fas fa-music"
    stopAllMusic()
    showToast("Background music disabled", "info")
  }
}

// Play Genre-Specific Music
function playGenreMusic(genre) {
  if (!isMusicPlaying) return

  stopAllMusic()

  const musicId = genreMusic[genre] || "classicMusic"
  const audio = document.getElementById(musicId)

  if (audio) {
    audio.volume = 0.3 // Keep it subtle
    audio.play().catch((e) => console.log("Audio play failed:", e))
    backgroundMusic = audio
  }
}

// Stop All Music
function stopAllMusic() {
  Object.keys(genreMusic).forEach((genre) => {
    const musicId = genreMusic[genre]
    const audio = document.getElementById(musicId)
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
  })
  backgroundMusic = null
}

// Load Books from APIs
async function loadBooks() {
  showLoading(true)

  try {
    // Try multiple APIs for better book coverage
    const [openLibraryBooks, gutenbergBooks] = await Promise.allSettled([
      fetchOpenLibraryBooks(),
      fetchGutenbergBooks(),
    ])

    let allBooks = []

    if (openLibraryBooks.status === "fulfilled") {
      allBooks = allBooks.concat(openLibraryBooks.value)
    }

    if (gutenbergBooks.status === "fulfilled") {
      allBooks = allBooks.concat(gutenbergBooks.value)
    }

    // Add some mock books if APIs fail
    if (allBooks.length === 0) {
      allBooks = getMockBooks()
    }

    books = allBooks
    filteredBooks = [...books]
    displayBooks()
    updateBookCount()
  } catch (error) {
    console.error("Error loading books:", error)
    books = getMockBooks()
    filteredBooks = [...books]
    displayBooks()
    showToast("Using offline book collection", "warning")
  } finally {
    showLoading(false)
  }
}

// Fetch from Open Library API
async function fetchOpenLibraryBooks() {
  const subjects = ["fiction", "mystery", "romance", "science", "history", "biography"]
  const allBooks = []

  for (const subject of subjects) {
    try {
      const response = await fetch(`https://openlibrary.org/subjects/${subject}.json?limit=20`)
      const data = await response.json()

      const books =
        data.works?.map((work) => ({
          id: work.key,
          title: work.title,
          author: work.authors?.[0]?.name || "Unknown Author",
          description: work.first_sentence || "No description available.",
          genre: subject,
          language: "en",
          cover: work.cover_id
            ? `https://covers.openlibrary.org/b/id/${work.cover_id}-L.jpg`
            : "/placeholder.svg?height=400&width=300",
          pdfUrl: `https://archive.org/download/${work.key.replace("/works/", "")}/`,
          downloadUrl: `https://archive.org/download/${work.key.replace("/works/", "")}/`,
          year: work.first_publish_year || 2020,
          pages: Math.floor(Math.random() * 400) + 100,
          rating: (Math.random() * 2 + 3).toFixed(1),
          free: Math.random() > 0.3,
        })) || []

      allBooks.push(...books)
    } catch (error) {
      console.error(`Error fetching ${subject} books:`, error)
    }
  }

  return allBooks
}

// Fetch from Project Gutenberg
async function fetchGutenbergBooks() {
  try {
    const response = await fetch("https://gutendex.com/books/?languages=en&page_size=50")
    const data = await response.json()

    return (
      data.results?.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.authors?.[0]?.name || "Unknown Author",
        description: book.subjects?.join(", ") || "Classic literature",
        genre: determineGenre(book.subjects || []),
        language: "en",
        cover: book.formats?.["image/jpeg"] || "/placeholder.svg?height=400&width=300",
        pdfUrl: book.formats?.["application/pdf"] || book.formats?.["text/html"],
        downloadUrl: book.formats?.["application/pdf"] || book.formats?.["text/plain"],
        year: book.download_count > 1000 ? 1900 + Math.floor(Math.random() * 100) : 2000,
        pages: Math.floor(Math.random() * 400) + 100,
        rating: (Math.random() * 2 + 3).toFixed(1),
        free: true,
      })) || []
    )
  } catch (error) {
    console.error("Error fetching Gutenberg books:", error)
    return []
  }
}

// Determine genre from subjects
function determineGenre(subjects) {
  const subjectStr = subjects.join(" ").toLowerCase()

  if (subjectStr.includes("fiction") || subjectStr.includes("novel")) return "fiction"
  if (subjectStr.includes("mystery") || subjectStr.includes("detective")) return "mystery"
  if (subjectStr.includes("romance") || subjectStr.includes("love")) return "romance"
  if (subjectStr.includes("science") || subjectStr.includes("technology")) return "science"
  if (subjectStr.includes("history") || subjectStr.includes("historical")) return "history"
  if (subjectStr.includes("biography") || subjectStr.includes("memoir")) return "biography"
  if (subjectStr.includes("fantasy") || subjectStr.includes("magic")) return "fantasy"
  if (subjectStr.includes("poetry") || subjectStr.includes("poems")) return "poetry"
  if (subjectStr.includes("philosophy")) return "philosophy"

  return "fiction"
}

// Mock Books Data
function getMockBooks() {
  return [
    {
      id: "mock-1",
      title: "The Great Adventure",
      author: "Jane Smith",
      description: "An epic tale of courage and discovery in uncharted territories.",
      genre: "fiction",
      language: "en",
      cover: "/placeholder.svg?height=400&width=300",
      pdfUrl: "https://example.com/sample.pdf",
      downloadUrl: "https://example.com/sample.pdf",
      year: 2023,
      pages: 324,
      rating: "4.5",
      free: true,
    },
    {
      id: "mock-2",
      title: "Mystery of the Lost City",
      author: "John Doe",
      description: "A thrilling mystery that will keep you guessing until the very end.",
      genre: "mystery",
      language: "en",
      cover: "/placeholder.svg?height=400&width=300",
      pdfUrl: "https://example.com/sample.pdf",
      downloadUrl: "https://example.com/sample.pdf",
      year: 2022,
      pages: 289,
      rating: "4.2",
      free: false,
    },
    {
      id: "mock-3",
      title: "Love in Paris",
      author: "Marie Claire",
      description: "A beautiful romance set against the backdrop of the City of Light.",
      genre: "romance",
      language: "en",
      cover: "/placeholder.svg?height=400&width=300",
      pdfUrl: "https://example.com/sample.pdf",
      downloadUrl: "https://example.com/sample.pdf",
      year: 2023,
      pages: 256,
      rating: "4.7",
      free: true,
    },
  ]
}

// Display Books
function displayBooks() {
  const booksGrid = document.getElementById("booksGrid")
  const startIndex = (currentPage - 1) * booksPerPage
  const endIndex = startIndex + booksPerPage
  const booksToShow = filteredBooks.slice(0, endIndex)

  if (booksToShow.length === 0) {
    booksGrid.innerHTML = `
            <div class="no-books">
                <i class="fas fa-search"></i>
                <h3>No books found</h3>
                <p>Try adjusting your search or filter criteria</p>
            </div>
        `
    return
  }

  booksGrid.innerHTML = booksToShow.map((book) => createBookCard(book)).join("")

  // Update load more button
  const loadMoreBtn = document.getElementById("loadMoreBtn")
  if (endIndex >= filteredBooks.length) {
    loadMoreBtn.style.display = "none"
  } else {
    loadMoreBtn.style.display = "block"
  }

  // Setup book card interactions
  setupBookCardInteractions()
}

// Create Book Card HTML
function createBookCard(book) {
  const isLoggedIn = currentUser !== null
  const canDownload = isLoggedIn && (currentUser.isPremium || book.free)

  return `
        <div class="book-card" data-book-id="${book.id}" data-genre="${book.genre}">
            <div class="book-cover">
                <img src="${book.cover}" alt="${book.title}" loading="lazy" 
                     onerror="this.src='/placeholder.svg?height=400&width=300'">
                ${book.free ? '<div class="book-badge">Free</div>' : '<div class="book-badge" style="background: var(--warning-gradient)">Premium</div>'}
            </div>
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">by ${book.author}</p>
                <p class="book-description">${book.description}</p>
                <div class="book-meta">
                    <span class="book-genre">${book.genre}</span>
                    <span>${book.year} • ${book.pages} pages</span>
                </div>
                <div class="book-actions">
                    <button class="action-btn read-btn" onclick="openBookReader('${book.id}')">
                        <i class="fas fa-book-open"></i>
                        Read
                    </button>
                    <button class="action-btn download-btn" onclick="handleDownload('${book.id}')" 
                            ${!canDownload ? "disabled" : ""}>
                        <i class="fas fa-download"></i>
                        ${canDownload ? "Download" : "Premium"}
                    </button>
                </div>
            </div>
        </div>
    `
}

// Setup Book Card Interactions
function setupBookCardInteractions() {
  const bookCards = document.querySelectorAll(".book-card")

  bookCards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      const genre = card.dataset.genre
      if (genre !== currentGenre) {
        currentGenre = genre
        playGenreMusic(genre)
      }
    })

    // Add click animation
    card.addEventListener("click", (e) => {
      if (!e.target.closest(".book-actions")) {
        card.style.transform = "scale(0.98)"
        setTimeout(() => {
          card.style.transform = ""
        }, 150)
      }
    })
  })
}

// Handle Search
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim()

  if (query === "") {
    filteredBooks = [...books]
  } else {
    filteredBooks = books.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.description.toLowerCase().includes(query) ||
        book.genre.toLowerCase().includes(query),
    )
  }

  currentPage = 1
  displayBooks()
  updateBookCount()
}

// Handle Genre Filter
function handleGenreFilter(e) {
  const genre = e.target.value
  applyFilters()
}

// Handle Language Filter
function handleLanguageFilter(e) {
  const language = e.target.value
  applyFilters()
}

// Apply All Filters
function applyFilters() {
  const genreFilter = document.getElementById("genreFilter").value
  const languageFilter = document.getElementById("languageFilter").value
  const searchQuery = document.getElementById("searchInput").value.toLowerCase().trim()

  filteredBooks = books.filter((book) => {
    const matchesGenre = !genreFilter || book.genre === genreFilter
    const matchesLanguage = !languageFilter || book.language === languageFilter
    const matchesSearch =
      !searchQuery ||
      book.title.toLowerCase().includes(searchQuery) ||
      book.author.toLowerCase().includes(searchQuery) ||
      book.description.toLowerCase().includes(searchQuery)

    return matchesGenre && matchesLanguage && matchesSearch
  })

  currentPage = 1
  displayBooks()
  updateBookCount()
}

// Voice Search
function startVoiceSearch() {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    showToast("Voice search not supported in this browser", "error")
    return
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const recognition = new SpeechRecognition()

  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = "en-US"

  const voiceBtn = document.getElementById("voiceSearch")
  const icon = voiceBtn.querySelector("i")

  recognition.onstart = () => {
    icon.className = "fas fa-microphone-slash"
    voiceBtn.style.background = "var(--secondary-gradient)"
    showToast("Listening...", "info")
  }

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    document.getElementById("searchInput").value = transcript
    handleSearch({ target: { value: transcript } })
    showToast(`Searching for: "${transcript}"`, "success")
  }

  recognition.onerror = (event) => {
    showToast("Voice search error: " + event.error, "error")
  }

  recognition.onend = () => {
    icon.className = "fas fa-microphone"
    voiceBtn.style.background = ""
  }

  recognition.start()
}

// Handle View Toggle
function handleViewToggle(e) {
  const viewBtns = document.querySelectorAll(".view-btn")
  const booksGrid = document.getElementById("booksGrid")
  const view = e.target.closest(".view-btn").dataset.view

  viewBtns.forEach((btn) => btn.classList.remove("active"))
  e.target.closest(".view-btn").classList.add("active")

  if (view === "list") {
    booksGrid.classList.add("list-view")
  } else {
    booksGrid.classList.remove("list-view")
  }

  // Save preference
  localStorage.setItem("viewPreference", view)
}

// Load More Books
function loadMoreBooks() {
  currentPage++
  displayBooks()
}

// Open Book Reader
function openBookReader(bookId) {
  const book = books.find((b) => b.id === bookId)
  if (!book) return

  const modal = document.getElementById("readerModal")
  const title = document.getElementById("readerTitle")
  const author = document.getElementById("readerAuthor")
  const pdfViewer = document.getElementById("pdfViewer")
  const overlay = document.getElementById("readerOverlay")

  title.textContent = book.title
  author.textContent = `by ${book.author}`

  // Check if user can access full content
  const canAccess = currentUser && (currentUser.isPremium || book.free)

  if (canAccess) {
    pdfViewer.src = book.pdfUrl
    overlay.style.display = "none"
  } else {
    // Show limited preview
    pdfViewer.src = book.pdfUrl + "#page=1&zoom=75"
    overlay.style.display = "flex"
  }

  openModal("readerModal")

  // Play genre music
  currentGenre = book.genre
  playGenreMusic(book.genre)
}

// Handle Download
function handleDownload(bookId) {
  const book = books.find((b) => b.id === bookId)
  if (!book) return

  if (!currentUser) {
    showToast("Please login to download books", "warning")
    openAuthModal()
    return
  }

  if (!currentUser.isPremium && !book.free) {
    openPaymentModal()
    return
  }

  // Simulate download
  showToast(`Downloading "${book.title}"...`, "success")

  // Create download link
  const link = document.createElement("a")
  link.href = book.downloadUrl
  link.download = `${book.title}.pdf`
  link.click()
}

// Setup Upload Form
function setupUploadForm() {
  const uploadArea = document.getElementById("uploadArea")
  const fileInput = document.getElementById("fileInput")
  const uploadForm = document.getElementById("uploadForm")

  // Drag and drop
  uploadArea.addEventListener("click", () => fileInput.click())

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault()
    uploadArea.classList.add("dragover")
  })

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover")
  })

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault()
    uploadArea.classList.remove("dragover")

    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].type === "application/pdf") {
      fileInput.files = files
      handleFileSelect(files[0])
    } else {
      showToast("Please select a PDF file", "error")
    }
  })

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0])
    }
  })

  uploadForm.addEventListener("submit", handleUploadSubmit)
}

// Handle File Select
function handleFileSelect(file) {
  const uploadArea = document.getElementById("uploadArea")
  const uploadProgress = document.getElementById("uploadProgress")

  uploadArea.querySelector("h3").textContent = file.name
  uploadArea.querySelector("p").textContent = `Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`

  // Show progress
  uploadProgress.style.display = "block"
  simulateUploadProgress()
}

// Simulate Upload Progress
function simulateUploadProgress() {
  const progressBar = document.querySelector(".progress-bar")
  const progressText = document.querySelector(".progress-text")
  let progress = 0

  const interval = setInterval(() => {
    progress += Math.random() * 15
    if (progress > 100) progress = 100

    progressBar.style.width = progress + "%"
    progressText.textContent = Math.round(progress) + "%"

    if (progress >= 100) {
      clearInterval(interval)
      setTimeout(() => {
        document.getElementById("uploadProgress").style.display = "none"
        showToast("File ready for upload!", "success")
      }, 500)
    }
  }, 200)
}

// Handle Upload Submit
function handleUploadSubmit(e) {
  e.preventDefault()

  if (!currentUser) {
    showToast("Please login to upload books", "warning")
    openAuthModal()
    return
  }

  const formData = new FormData(e.target)
  const bookData = {
    title: formData.get("bookTitle"),
    author: formData.get("bookAuthor"),
    genre: formData.get("bookGenre"),
    language: formData.get("bookLanguage"),
    description: formData.get("bookDescription"),
  }

  // Validate required fields
  if (!bookData.title || !bookData.author || !bookData.genre || !bookData.language) {
    showToast("Please fill in all required fields", "error")
    return
  }

  // Simulate upload
  const submitBtn = e.target.querySelector(".submit-btn")
  submitBtn.disabled = true
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...'

  setTimeout(() => {
    showToast("Book uploaded successfully!", "success")
    e.target.reset()
    document.getElementById("uploadProgress").style.display = "none"
    document.getElementById("uploadArea").querySelector("h3").textContent = "Drag & Drop your PDF here"
    document.getElementById("uploadArea").querySelector("p").textContent = "or click to browse files"

    submitBtn.disabled = false
    submitBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Book'

    // Add to books array (simulation)
    const newBook = {
      id: "user-" + Date.now(),
      ...bookData,
      cover: "/placeholder.svg?height=400&width=300",
      pdfUrl: "https://example.com/sample.pdf",
      downloadUrl: "https://example.com/sample.pdf",
      year: new Date().getFullYear(),
      pages: Math.floor(Math.random() * 400) + 100,
      rating: "0.0",
      free: true,
    }

    books.unshift(newBook)
    filteredBooks = [...books]
    displayBooks()
    updateBookCount()
  }, 2000)
}

// Authentication Functions
function setupAuthForm() {
  const authTabs = document.querySelectorAll(".auth-tab")
  const authForm = document.getElementById("authForm")
  const usePhoneCheckbox = document.getElementById("usePhone")
  const phoneGroup = document.getElementById("phoneGroup")
  const emailInput = document.getElementById("authEmail")
  const phoneInput = document.getElementById("authPhone")

  authTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      authTabs.forEach((t) => t.classList.remove("active"))
      tab.classList.add("active")

      const authTitle = document.getElementById("authTitle")
      authTitle.textContent = tab.dataset.tab === "login" ? "Welcome Back" : "Join Our Library"
    })
  })

  usePhoneCheckbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      phoneGroup.style.display = "block"
      emailInput.required = false
      phoneInput.required = true
    } else {
      phoneGroup.style.display = "none"
      emailInput.required = true
      phoneInput.required = false
    }
  })

  authForm.addEventListener("submit", handleAuthSubmit)
}

// Handle Auth Submit
function handleAuthSubmit(e) {
  e.preventDefault()

  const usePhone = document.getElementById("usePhone").checked
  const contact = usePhone ? document.getElementById("authPhone").value : document.getElementById("authEmail").value

  if (!contact) {
    showToast("Please enter your email or phone number", "error")
    return
  }

  // Show OTP section
  document.querySelector(".auth-form").style.display = "none"
  document.getElementById("otpSection").style.display = "block"

  // Simulate sending OTP
  showToast(`OTP sent to ${contact}`, "success")

  // Auto-focus first OTP input
  document.querySelector(".otp-input").focus()
}

// Setup OTP Inputs
function setupOTPInputs() {
  const otpInputs = document.querySelectorAll(".otp-input")
  const verifyBtn = document.getElementById("verifyOtpBtn")

  otpInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      if (e.target.value.length === 1 && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus()
      }

      // Check if all inputs are filled
      const allFilled = Array.from(otpInputs).every((inp) => inp.value.length === 1)
      verifyBtn.disabled = !allFilled
    })

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && e.target.value === "" && index > 0) {
        otpInputs[index - 1].focus()
      }
    })
  })

  verifyBtn.addEventListener("click", handleOTPVerification)
}

// Handle OTP Verification
function handleOTPVerification() {
  const otpInputs = document.querySelectorAll(".otp-input")
  const otp = Array.from(otpInputs)
    .map((input) => input.value)
    .join("")

  // Simulate OTP verification
  if (otp === "123456" || otp.length === 6) {
    // Create user session
    currentUser = {
      id: "user-" + Date.now(),
      email: document.getElementById("authEmail").value || "user@example.com",
      phone: document.getElementById("authPhone").value || null,
      isPremium: false,
      joinDate: new Date().toISOString(),
    }

    localStorage.setItem("currentUser", JSON.stringify(currentUser))

    showToast("Login successful!", "success")
    closeModal("authModal")
    updateAuthUI()

    // Reset form
    resetAuthForm()
  } else {
    showToast("Invalid OTP. Please try again.", "error")
    otpInputs.forEach((input) => {
      input.value = ""
      input.classList.add("error")
    })
    otpInputs[0].focus()

    setTimeout(() => {
      otpInputs.forEach((input) => input.classList.remove("error"))
    }, 2000)
  }
}

// Reset Auth Form
function resetAuthForm() {
  document.getElementById("authForm").reset()
  document.querySelector(".auth-form").style.display = "block"
  document.getElementById("otpSection").style.display = "none"
  document.querySelectorAll(".otp-input").forEach((input) => (input.value = ""))
  document.getElementById("phoneGroup").style.display = "none"
  document.getElementById("usePhone").checked = false
}

// Check Auth State
function checkAuthState() {
  const savedUser = localStorage.getItem("currentUser")
  if (savedUser) {
    currentUser = JSON.parse(savedUser)
    updateAuthUI()
  }
}

// Update Auth UI
function updateAuthUI() {
  const authBtn = document.getElementById("authBtn")
  const profileLink = document.getElementById("profileLink")

  if (currentUser) {
    authBtn.innerHTML = '<i class="fas fa-user"></i><span>Profile</span>'
    authBtn.onclick = showUserProfile
    profileLink.style.display = "flex"
  } else {
    authBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Login</span>'
    authBtn.onclick = openAuthModal
    profileLink.style.display = "none"
  }
}

// Show User Profile
function showUserProfile() {
  if (!currentUser) return

  const profileInfo = `
        <div class="user-profile">
            <h3>User Profile</h3>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>Status:</strong> ${currentUser.isPremium ? "Premium Member" : "Free Member"}</p>
            <p><strong>Joined:</strong> ${new Date(currentUser.joinDate).toLocaleDateString()}</p>
            <div class="profile-actions">
                ${!currentUser.isPremium ? '<button onclick="openPaymentModal()" class="upgrade-btn"><i class="fas fa-crown"></i> Upgrade to Premium</button>' : ""}
                <button onclick="logout()" class="logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</button>
            </div>
        </div>
    `

  showToast(profileInfo, "info", 5000)
}

// Logout
function logout() {
  currentUser = null
  localStorage.removeItem("currentUser")
  updateAuthUI()
  showToast("Logged out successfully", "success")

  // Refresh books display to update download buttons
  displayBooks()
}

// Payment Functions
function setupPaymentHandlers() {
  const selectPlanBtns = document.querySelectorAll(".select-plan-btn")

  selectPlanBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const plan = e.target.dataset.plan
      handlePayment(plan)
    })
  })
}

// Handle Payment
function handlePayment(plan) {
  if (!currentUser) {
    showToast("Please login first", "warning")
    closeModal("paymentModal")
    openAuthModal()
    return
  }

  // Simulate payment processing
  const btn = event.target
  const originalText = btn.textContent

  btn.disabled = true
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'

  setTimeout(() => {
    if (plan === "premium") {
      currentUser.isPremium = true
      localStorage.setItem("currentUser", JSON.stringify(currentUser))
      showToast("Welcome to Premium! 🎉", "success")
    } else {
      showToast("Payment successful! Book unlocked.", "success")
    }

    closeModal("paymentModal")
    updateAuthUI()
    displayBooks() // Refresh to show updated download buttons

    btn.disabled = false
    btn.textContent = originalText
  }, 2000)
}

// Modal Functions
function openModal(modalId) {
  const modal = document.getElementById(modalId)
  modal.classList.add("active")
  document.body.style.overflow = "hidden"

  // Focus management
  const firstFocusable = modal.querySelector("button, input, select, textarea")
  if (firstFocusable) firstFocusable.focus()
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId)
  modal.classList.remove("active")
  document.body.style.overflow = ""

  // Reset forms
  if (modalId === "authModal") {
    resetAuthForm()
  }
}

function openAuthModal() {
  openModal("authModal")
}

function openPaymentModal() {
  openModal("paymentModal")
}

// Handle Outside Click
function handleOutsideClick(e) {
  if (e.target.classList.contains("modal-overlay")) {
    const modalId = e.target.id
    closeModal(modalId)
  }
}

// Keyboard Navigation
function handleKeyboardNavigation(e) {
  // Close modal on Escape
  if (e.key === "Escape") {
    const activeModal = document.querySelector(".modal-overlay.active")
    if (activeModal) {
      closeModal(activeModal.id)
    }
  }

  // Quick search with Ctrl+K
  if (e.ctrlKey && e.key === "k") {
    e.preventDefault()
    document.getElementById("searchInput").focus()
  }
}

// Theme Functions
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme")
  const newTheme = currentTheme === "dark" ? "light" : "dark"

  document.documentElement.setAttribute("data-theme", newTheme)
  localStorage.setItem("theme", newTheme)
  updateThemeIcon(newTheme)

  showToast(`Switched to ${newTheme} theme`, "success")
}

function updateThemeIcon(theme) {
  const themeIcon = document.querySelector("#themeToggle i")
  themeIcon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon"
}

// Mobile Menu
function toggleMobileMenu() {
  const navMenu = document.getElementById("navMenu")
  const menuToggle = document.getElementById("mobileMenuToggle")
  const icon = menuToggle.querySelector("i")

  navMenu.classList.toggle("active")
  icon.className = navMenu.classList.contains("active") ? "fas fa-times" : "fas fa-bars"
}

// Utility Functions
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

function showLoading(show) {
  const loadingSpinner = document.getElementById("loadingSpinner")
  const booksGrid = document.getElementById("booksGrid")

  if (show) {
    loadingSpinner.style.display = "block"
    booksGrid.style.display = "none"
  } else {
    loadingSpinner.style.display = "none"
    booksGrid.style.display = "grid"
  }
}

function updateBookCount() {
  const totalBooksElement = document.getElementById("totalBooks")
  if (totalBooksElement) {
    totalBooksElement.textContent = `${filteredBooks.length.toLocaleString()}+`
  }
}

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId)
  if (section) {
    section.scrollIntoView({ behavior: "smooth" })
  }
}

// Toast Notifications
function showToast(message, type = "info", duration = 3000) {
  const toastContainer = document.getElementById("toastContainer")
  const toast = document.createElement("div")

  const icons = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
    info: "fas fa-info-circle",
  }

  toast.className = `toast ${type}`
  toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <div>${message}</div>
    `

  toastContainer.appendChild(toast)

  // Trigger animation
  setTimeout(() => toast.classList.add("show"), 100)

  // Remove toast
  setTimeout(() => {
    toast.classList.remove("show")
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 300)
  }, duration)
}

// Intersection Observer for Animations
function setupIntersectionObserver() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1"
        entry.target.style.transform = "translateY(0)"
      }
    })
  }, observerOptions)

  // Observe elements that should animate on scroll
  const animateElements = document.querySelectorAll(".book-card, .section-header, .upload-container")
  animateElements.forEach((el) => {
    el.style.opacity = "0"
    el.style.transform = "translateY(20px)"
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease"
    observer.observe(el)
  })
}

// Error Handling
window.addEventListener("error", (e) => {
  console.error("Global error:", e.error)
  showToast("Something went wrong. Please try again.", "error")
})

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason)
  showToast("Network error. Please check your connection.", "error")
})

// Performance Monitoring
if ("performance" in window) {
  window.addEventListener("load", () => {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart
    console.log(`Page loaded in ${loadTime}ms`)

    if (loadTime > 3000) {
      showToast("Slow connection detected. Some features may be limited.", "warning")
    }
  })
}

// Service Worker Registration (for PWA capabilities)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration)
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError)
      })
  })
}
