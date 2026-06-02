const pageData = {
  brand: "bazoš2",
  headline: "Inzeráty",
};

const app = document.querySelector("#app");

const createElement = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) {
    el.className = className;
  }
  if (text !== undefined) {
    el.textContent = text;
  }
  return el;
};

const createField = (labelText, inputEl) => {
  const label = createElement("label", "field");
  const span = createElement("span", "field-label", labelText);
  label.append(span, inputEl);
  return label;
};

const createButton = (label, className = "button") => {
  const button = createElement("button", className, label);
  button.type = "button";
  return button;
};

const hero = document.createElement("header");
hero.className = "hero";
hero.innerHTML = `
  <div class="container">
    <p class="eyebrow">${pageData.brand}</p>
    <h1>${pageData.headline}</h1>
  </div>
`;

const main = document.createElement("main");
main.className = "container slides";

const createSlide = ({ id, title, description, build }) => {
  const section = createElement("section", "slide");
  section.id = `slide-${id}`;

  const header = createElement("div", "slide-header");
  header.append(createElement("h2", null, title));
  header.append(createElement("p", null, description));

  const demo = build();
  demo.classList.add("demo");

  section.append(header, demo);
  return section;
};

const buildOffersDemo = () => {
  const state = {
    query: "",
    min: "",
    max: "",
    sort: "price-asc",
  };

  let products = [];

  const wrapper = createElement("div");
  const filters = createElement("div", "filter-row");

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Hledat produkt na Alze";
  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderOffers();
  });

  const minInput = document.createElement("input");
  minInput.type = "number";
  minInput.placeholder = "Min. cena";
  minInput.addEventListener("input", (event) => {
    state.min = event.target.value;
    renderOffers();
  });

  const maxInput = document.createElement("input");
  maxInput.type = "number";
  maxInput.placeholder = "Max. cena";
  maxInput.addEventListener("input", (event) => {
    state.max = event.target.value;
    renderOffers();
  });

  const sortSelect = document.createElement("select");
  [
    { value: "price-asc", label: "Cena vzestupně" },
    { value: "price-desc", label: "Cena sestupně" },
    { value: "name", label: "Název A-Z" },
  ].forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    sortSelect.appendChild(option);
  });
  sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderOffers();
  });

  filters.append(
    createField("Hledání", searchInput),
    createField("Min. cena", minInput),
    createField("Max. cena", maxInput),
    createField("Řazení", sortSelect),
  );

  const statusText = createElement("p", "source-note");
  const resultText = createElement("p", "hint");
  const list = createElement("div", "card-grid");

  const parsePrice = (value) => {
    const digits = value.replace(/[^\d]/g, "");
    return digits ? Number(digits) : Number.NaN;
  };

  const priceValue = (item) => {
    const numeric = parsePrice(item.price || "");
    return Number.isNaN(numeric) ? null : numeric;
  };

  const showLoading = () => {
    list.innerHTML = "";
    list.append(createElement("div", "empty-state", "Načítám nabídky z Alzy..."));
  };

  const renderOffers = () => {
    const minValue = Number(state.min);
    const maxValue = Number(state.max);
    let filtered = products.filter((item) => {
      if (state.query && !item.name.toLowerCase().includes(state.query)) {
        return false;
      }
      const price = priceValue(item);
      if (!Number.isNaN(minValue) && state.min !== "" && price !== null && price < minValue) {
        return false;
      }
      if (!Number.isNaN(maxValue) && state.max !== "" && price !== null && price > maxValue) {
        return false;
      }
      return true;
    });

    if (state.sort === "price-asc") {
      filtered = filtered.sort((a, b) => (priceValue(a) ?? 1e15) - (priceValue(b) ?? 1e15));
    } else if (state.sort === "price-desc") {
      filtered = filtered.sort((a, b) => (priceValue(b) ?? -1) - (priceValue(a) ?? -1));
    } else {
      filtered = filtered.sort((a, b) => a.name.localeCompare(b.name, "cs"));
    }

    list.innerHTML = "";
    if (filtered.length === 0) {
      list.append(createElement("div", "empty-state", "Žádné nabídky neodpovídají filtrům."));
    } else {
      filtered.forEach((item) => {
        const card = createElement("div", "card product-card");
        if (item.image) {
          const img = document.createElement("img");
          img.src = item.image;
          img.alt = item.name;
          img.className = "product-image";
          card.append(img);
        }
        card.append(createElement("h3", null, item.name));
        if (item.badge) {
          card.append(createElement("span", "tag", item.badge));
        }
        card.append(createElement("p", "price", item.price || "Neuvedeno"));
        if (item.url) {
          const link = createElement("a", "button secondary", "Detail na Alze");
          link.href = item.url;
          link.target = "_blank";
          link.rel = "noopener";
          card.append(link);
        }
        list.append(card);
      });
    }
    resultText.textContent = `Zobrazeno ${filtered.length} z ${products.length} nabídek.`;
  };

  const loadOffers = async () => {
    statusText.textContent = "Načítám nabídky z Alzy...";
    showLoading();
    try {
      const response = await fetch("/api/alza");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Chyba načítání");
      }
      products = payload.items || [];
      const updated = payload.updatedAt ? new Date(payload.updatedAt).toLocaleString("cs-CZ") : "neznámo";
      statusText.textContent = `Zdroj: Alza.cz · aktualizováno ${updated}`;
      renderOffers();
    } catch (error) {
      statusText.textContent = "Nepodařilo se načíst nabídky z Alzy.";
      list.innerHTML = "";
      list.append(createElement("div", "empty-state", "Zkus to prosím znovu později."));
      resultText.textContent = "";
    }
  };

  loadOffers();
  wrapper.append(filters, statusText, resultText, list);
  return wrapper;
};

const buildDuolingoDemo = () => {
  const quiz = [
    { prompt: "Dům", answer: "House", options: ["House", "Car", "Tree", "Sun"] },
    { prompt: "Kočka", answer: "Cat", options: ["Dog", "Cat", "Bird", "Horse"] },
    { prompt: "Auto", answer: "Car", options: ["Train", "Car", "Bus", "Ship"] },
    { prompt: "Jablko", answer: "Apple", options: ["Apple", "Orange", "Pear", "Grape"] },
    { prompt: "Město", answer: "City", options: ["Village", "City", "Street", "Road"] },
  ];

  const wrapper = createElement("div");
  const stats = createElement("div", "stats");
  const scoreValue = createElement("strong", null, "0");
  const streakValue = createElement("strong", null, "0");

  const scoreStat = createElement("div", "stat");
  scoreStat.append(createElement("span", null, "Skóre"), scoreValue);
  const streakStat = createElement("div", "stat");
  streakStat.append(createElement("span", null, "Série"), streakValue);
  stats.append(scoreStat, streakStat);

  const promptEl = createElement("h3", "demo-title");
  const optionsEl = createElement("div", "option-grid");
  const feedback = createElement("p", "feedback");
  const nextButton = createButton("Další otázka", "button secondary");

  let score = 0;
  let streak = 0;
  let activeQuestion = null;
  let answered = false;

  const shuffle = (items) => {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const renderQuestion = () => {
    answered = false;
    feedback.textContent = "";
    feedback.className = "feedback";
    optionsEl.innerHTML = "";
    activeQuestion = quiz[Math.floor(Math.random() * quiz.length)];
    promptEl.textContent = `Přelož: ${activeQuestion.prompt}`;
    shuffle(activeQuestion.options).forEach((option) => {
      const button = createButton(option, "button ghost");
      button.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const correct = option === activeQuestion.answer;
        feedback.textContent = correct ? "Správně! 🎉" : `Špatně, správně je: ${activeQuestion.answer}`;
        feedback.classList.add(correct ? "success" : "error");
        score += correct ? 10 : 0;
        streak = correct ? streak + 1 : 0;
        scoreValue.textContent = score.toString();
        streakValue.textContent = streak.toString();
      });
      optionsEl.appendChild(button);
    });
  };

  nextButton.addEventListener("click", renderQuestion);

  renderQuestion();
  wrapper.append(stats, promptEl, optionsEl, feedback, nextButton);
  return wrapper;
};

const buildRequestsDemo = () => {
  let counter = 3;
  const requests = [
    { id: 1, title: "Hledám lektora angličtiny", budget: 450, city: "Praha", priority: "Střední", status: "open" },
    { id: 2, title: "Sháním lednici do 5000 Kč", budget: 5000, city: "Brno", priority: "Vysoká", status: "progress" },
  ];

  const wrapper = createElement("div");
  const form = document.createElement("form");
  form.className = "form-row";
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.placeholder = "Co poptáváš?";
  const budgetInput = document.createElement("input");
  budgetInput.type = "number";
  budgetInput.placeholder = "Rozpočet";
  const cityInput = document.createElement("input");
  cityInput.type = "text";
  cityInput.placeholder = "Město";
  const prioritySelect = document.createElement("select");
  ["Nízká", "Střední", "Vysoká"].forEach((priority) => {
    const option = document.createElement("option");
    option.value = priority;
    option.textContent = priority;
    prioritySelect.appendChild(option);
  });
  const submitButton = createButton("Přidat poptávku");
  submitButton.type = "submit";
  const formMessage = createElement("p", "feedback");

  form.append(
    createField("Poptávka", titleInput),
    createField("Rozpočet (Kč)", budgetInput),
    createField("Lokalita", cityInput),
    createField("Priorita", prioritySelect),
    submitButton,
  );

  const list = createElement("div", "card-grid");

  const renderRequests = () => {
    list.innerHTML = "";
    requests.forEach((request) => {
      const card = createElement("div", "card");
      const status = createElement("span", `status ${request.status}`);
      status.textContent =
        request.status === "open" ? "Otevřená" : request.status === "progress" ? "V řešení" : "Splněno";
      card.append(status);
      card.append(createElement("h3", null, request.title));
      card.append(createElement("p", null, `${request.budget.toLocaleString("cs-CZ")} Kč · ${request.city}`));
      card.append(createElement("span", "tag", `Priorita: ${request.priority}`));

      const actions = createElement("div", "action-row");
      if (request.status === "open") {
        const takeButton = createButton("Převzít", "button secondary");
        takeButton.addEventListener("click", () => {
          request.status = "progress";
          renderRequests();
        });
        actions.append(takeButton);
      }
      if (request.status === "progress") {
        const doneButton = createButton("Hotovo");
        doneButton.addEventListener("click", () => {
          request.status = "done";
          renderRequests();
        });
        actions.append(doneButton);
      }
      if (request.status === "done") {
        const reopenButton = createButton("Znovu otevřít", "button ghost");
        reopenButton.addEventListener("click", () => {
          request.status = "open";
          renderRequests();
        });
        actions.append(reopenButton);
      }
      card.append(actions);
      list.append(card);
    });
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    const budget = Number(budgetInput.value);
    const city = cityInput.value.trim();
    if (!title || Number.isNaN(budget)) {
      formMessage.textContent = "Vyplň název poptávky a rozpočet.";
      formMessage.classList.add("error");
      return;
    }
    requests.unshift({
      id: counter,
      title,
      budget,
      city: city || "Online",
      priority: prioritySelect.value,
      status: "open",
    });
    counter += 1;
    titleInput.value = "";
    budgetInput.value = "";
    cityInput.value = "";
    prioritySelect.value = "Střední";
    formMessage.textContent = "Poptávka přidána.";
    formMessage.className = "feedback success";
    renderRequests();
  });

  renderRequests();
  wrapper.append(form, formMessage, list);
  return wrapper;
};

const buildJobsDemo = () => {
  const state = { query: "", location: "all", sort: "default" };
  let jobs = [];

  const wrapper = createElement("div");
  const filters = createElement("div", "filter-row");

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Hledat brigádu";
  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderJobs();
  });

  const locationSelect = document.createElement("select");
  const sortSelect = document.createElement("select");
  [
    { value: "default", label: "Aktuální pořadí" },
    { value: "name-asc", label: "Název A-Z" },
    { value: "name-desc", label: "Název Z-A" },
  ].forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    sortSelect.appendChild(option);
  });
  sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderJobs();
  });

  locationSelect.addEventListener("change", (event) => {
    state.location = event.target.value;
    renderJobs();
  });

  filters.append(
    createField("Hledání", searchInput),
    createField("Lokalita", locationSelect),
    createField("Řazení", sortSelect),
  );

  const statusText = createElement("p", "source-note");
  const resultText = createElement("p", "hint");
  const list = createElement("div", "card-grid");

  const updateLocationOptions = () => {
    const locations = [...new Set(jobs.map((job) => job.location).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "cs"),
    );
    locationSelect.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "Všechny lokality";
    locationSelect.appendChild(allOption);
    locations.forEach((location) => {
      const option = document.createElement("option");
      option.value = location;
      option.textContent = location;
      locationSelect.appendChild(option);
    });
  };

  const showLoading = () => {
    list.innerHTML = "";
    list.append(createElement("div", "empty-state", "Načítám nabídky brigád..."));
  };

  const renderJobs = () => {
    let filtered = jobs.filter((job) => {
      if (
        state.query &&
        !`${job.title} ${job.company} ${job.location}`.toLowerCase().includes(state.query)
      ) {
        return false;
      }
      if (state.location !== "all" && job.location !== state.location) {
        return false;
      }
      return true;
    });

    if (state.sort === "name-asc") {
      filtered = filtered.sort((a, b) => a.title.localeCompare(b.title, "cs"));
    } else if (state.sort === "name-desc") {
      filtered = filtered.sort((a, b) => b.title.localeCompare(a.title, "cs"));
    }

    list.innerHTML = "";
    if (filtered.length === 0) {
      list.append(createElement("div", "empty-state", "Žádné brigády neodpovídají filtrům."));
    } else {
      filtered.forEach((job) => {
        const card = createElement("div", "card");
        card.append(createElement("h3", null, job.title));
        card.append(createElement("p", "hint", job.company));
        card.append(createElement("p", null, `${job.location} · ${job.reward}`));
        const tags = createElement("div", "tag-row");
        tags.append(createElement("span", "tag", `Zveřejněno ${job.date}`));
        card.append(tags);
        if (job.url) {
          const link = createElement("a", "button secondary", "Detail nabídky");
          link.href = job.url;
          link.target = "_blank";
          link.rel = "noopener";
          card.append(link);
        }
        list.append(card);
      });
    }
    resultText.textContent = `Zobrazeno ${filtered.length} z ${jobs.length} nabídek.`;
  };

  const loadJobs = async () => {
    statusText.textContent = "Načítám nabídky brigád...";
    showLoading();
    try {
      const response = await fetch("/api/jobs");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Chyba načítání");
      }
      jobs = payload.items || [];
      updateLocationOptions();
      const updated = payload.updatedAt ? new Date(payload.updatedAt).toLocaleString("cs-CZ") : "neznámo";
      statusText.textContent = `Zdroj: JenPráce.cz · aktualizováno ${updated}`;
      renderJobs();
    } catch (error) {
      statusText.textContent = "Nepodařilo se načíst nabídky brigád.";
      list.innerHTML = "";
      list.append(createElement("div", "empty-state", "Zkus to prosím znovu později."));
      resultText.textContent = "";
    }
  };

  loadJobs();
  wrapper.append(filters, statusText, resultText, list);
  return wrapper;
};

const buildChatDemo = () => {
  const wrapper = createElement("div");
  const messages = createElement("div", "chat-window");
  const typing = createElement("div", "typing", "BazošBot píše...");
  typing.style.display = "none";
  const form = document.createElement("form");
  form.className = "form-row";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Napiš zprávu...";
  const sendButton = createButton("Odeslat");
  sendButton.type = "submit";
  form.append(createField("Zpráva", input), sendButton);

  const botReplies = [
    "Díky za zprávu! Můžu ti nabídnout slevu, když vyzvedneš dnes.",
    "Jasně, mám ještě volný termín ve středu.",
    "Pošlu ti detaily do soukromé zprávy.",
    "V balíku je i příslušenství, které se ti bude hodit.",
  ];

  const addMessage = (author, text) => {
    const bubble = createElement("div", `message ${author}`);
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMessage("user", text);
    input.value = "";
    typing.style.display = "block";
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
    setTimeout(() => {
      typing.style.display = "none";
      addMessage("bot", botReplies[Math.floor(Math.random() * botReplies.length)]);
    }, 700);
  });

  addMessage("bot", "Ahoj! Jsem tady, když budeš potřebovat info o nabídce.");
  wrapper.append(messages, form);
  return wrapper;
};

const buildAuctionDemo = () => {
  const wrapper = createElement("div");
  const auction = {
    title: "Retro kolo Favorit",
    currentBid: 2400,
    minIncrement: 100,
    endsAt: Date.now() + 90000,
    history: [],
  };

  const banner = createElement("div", "auction-banner");
  const bidValue = createElement("strong", null, `${auction.currentBid} Kč`);
  const timeValue = createElement("strong", null, "01:30");
  const bidStat = createElement("div", "stat");
  bidStat.append(createElement("span", null, "Aktuální nabídka"), bidValue);
  const timeStat = createElement("div", "stat");
  timeStat.append(createElement("span", null, "Zbývá času"), timeValue);
  banner.append(bidStat, timeStat);

  const bidForm = document.createElement("form");
  bidForm.className = "form-row";
  const bidInput = document.createElement("input");
  bidInput.type = "number";
  bidInput.min = auction.currentBid + auction.minIncrement;
  bidInput.placeholder = `Min. ${auction.currentBid + auction.minIncrement} Kč`;
  const bidButton = createButton("Přihodit");
  bidButton.type = "submit";
  const quickPlus = createButton("+100", "button secondary");
  const quickPlusBig = createButton("+500", "button secondary");
  const feedback = createElement("p", "feedback");

  const historyList = createElement("ul", "history");

  const renderHistory = () => {
    historyList.innerHTML = "";
    if (auction.history.length === 0) {
      historyList.append(createElement("li", "hint", "Zatím bez příhozů."));
      return;
    }
    auction.history.slice(-4).reverse().forEach((item) => {
      historyList.append(createElement("li", null, `${item.bidder}: ${item.amount} Kč`));
    });
  };

  const updateBid = (amount, bidder = "Ty") => {
    auction.currentBid = amount;
    bidValue.textContent = `${auction.currentBid} Kč`;
    bidInput.min = auction.currentBid + auction.minIncrement;
    bidInput.placeholder = `Min. ${auction.currentBid + auction.minIncrement} Kč`;
    auction.history.push({ amount, bidder });
    renderHistory();
  };

  const handleBid = (amount) => {
    if (amount < auction.currentBid + auction.minIncrement) {
      feedback.textContent = `Minimální příhoz je ${auction.currentBid + auction.minIncrement} Kč.`;
      feedback.className = "feedback error";
      return;
    }
    feedback.textContent = "Příhoz přijat.";
    feedback.className = "feedback success";
    updateBid(amount);
  };

  bidForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(bidInput.value);
    if (Number.isNaN(amount)) return;
    handleBid(amount);
    bidInput.value = "";
  });

  quickPlus.addEventListener("click", () => handleBid(auction.currentBid + 100));
  quickPlusBig.addEventListener("click", () => handleBid(auction.currentBid + 500));

  const timer = setInterval(() => {
    const remaining = auction.endsAt - Date.now();
    if (remaining <= 0) {
      clearInterval(timer);
      timeValue.textContent = "00:00";
      bidInput.disabled = true;
      bidButton.disabled = true;
      quickPlus.disabled = true;
      quickPlusBig.disabled = true;
      feedback.textContent = "Aukce skončila. Vítězem je nejvyšší nabídka.";
      feedback.className = "feedback";
      return;
    }
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    timeValue.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, 1000);

  renderHistory();
  bidForm.append(createField("Tvoje nabídka", bidInput), bidButton, quickPlus, quickPlusBig);
  wrapper.append(createElement("h3", null, auction.title), banner, bidForm, feedback, historyList);
  return wrapper;
};

const buildCommentsDemo = () => {
  let counter = 3;
  const comments = [
    { id: 1, name: "Lenka", text: "Rychlá domluva, doporučuji.", likes: 2, flagged: false },
    { id: 2, name: "Marek", text: "Zboží odpovídalo popisu.", likes: 1, flagged: false },
  ];

  const wrapper = createElement("div");
  const form = document.createElement("form");
  form.className = "form-row";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Jméno";
  const textInput = document.createElement("textarea");
  textInput.rows = 3;
  textInput.placeholder = "Komentář";
  const submitButton = createButton("Přidat komentář");
  submitButton.type = "submit";
  const list = createElement("div", "card-grid");

  const renderComments = () => {
    list.innerHTML = "";
    comments.forEach((comment) => {
      const card = createElement("div", "card");
      card.append(createElement("h3", null, comment.name));
      card.append(createElement("p", null, comment.text));
      const likeButton = createButton(`👍 ${comment.likes}`, "button secondary");
      likeButton.addEventListener("click", () => {
        comment.likes += 1;
        renderComments();
      });
      const flagButton = createButton(comment.flagged ? "Nahlášeno" : "Nahlásit", "button ghost");
      flagButton.disabled = comment.flagged;
      flagButton.addEventListener("click", () => {
        comment.flagged = true;
        renderComments();
      });
      const actionRow = createElement("div", "action-row");
      actionRow.append(likeButton, flagButton);
      card.append(actionRow);
      list.append(card);
    });
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim() || "Anonym";
    const text = textInput.value.trim();
    if (!text) return;
    comments.unshift({ id: counter, name, text, likes: 0, flagged: false });
    counter += 1;
    nameInput.value = "";
    textInput.value = "";
    renderComments();
  });

  renderComments();
  form.append(createField("Jméno", nameInput), createField("Komentář", textInput), submitButton);
  wrapper.append(form, list);
  return wrapper;
};

const buildLikesDemo = () => {
  const items = [
    { title: "Skříň do předsíně", likes: 12, liked: false },
    { title: "Kávovar espresso", likes: 8, liked: false },
    { title: "Vstupenka na koncert", likes: 15, liked: false },
  ];

  const wrapper = createElement("div");
  const totalValue = createElement("strong", null, "0");
  const summary = createElement("div", "stat");
  summary.append(createElement("span", null, "Celkem liků"));
  summary.append(totalValue);

  const list = createElement("div", "card-grid");

  const renderLikes = () => {
    list.innerHTML = "";
    const total = items.reduce((sum, item) => sum + item.likes, 0);
    totalValue.textContent = total.toString();
    items.forEach((item) => {
      const card = createElement("div", "card");
      card.append(createElement("h3", null, item.title));
      const button = createButton(item.liked ? "💙 Líbí" : "🤍 Líbí", item.liked ? "button" : "button secondary");
      button.addEventListener("click", () => {
        item.liked = !item.liked;
        item.likes += item.liked ? 1 : -1;
        renderLikes();
      });
      card.append(createElement("p", "hint", `Počet: ${item.likes}`), button);
      list.append(card);
    });
  };

  renderLikes();
  wrapper.append(summary, list);
  return wrapper;
};

const buildDatingDemo = () => {
  const profiles = [
    { name: "Tereza", age: 26, city: "Praha", bio: "Miluju kavárny, design a procházky se psem." },
    { name: "David", age: 31, city: "Brno", bio: "Sportovec, cyklista a kuchař amatér." },
    { name: "Simona", age: 28, city: "Ostrava", bio: "Ráda cestuju a objevují nové chutě." },
  ];
  let index = 0;
  const matches = [];

  const wrapper = createElement("div");
  const card = createElement("div", "profile-card");
  const matchInfo = createElement("p", "hint");
  const buttonRow = createElement("div", "action-row");
  const likeButton = createButton("Líbí");
  const skipButton = createButton("Přeskočit", "button secondary");

  const renderProfile = () => {
    card.innerHTML = "";
    if (index >= profiles.length) {
      card.append(createElement("h3", null, "Žádné další profily"));
      card.append(createElement("p", null, `Matches: ${matches.length}`));
      likeButton.disabled = true;
      skipButton.disabled = true;
      return;
    }
    const profile = profiles[index];
    card.append(createElement("h3", null, `${profile.name}, ${profile.age}`));
    card.append(createElement("p", "hint", profile.city));
    card.append(createElement("p", null, profile.bio));
  };

  likeButton.addEventListener("click", () => {
    if (index >= profiles.length) return;
    matches.push(profiles[index]);
    matchInfo.textContent = `Nový match: ${profiles[index].name}`;
    index += 1;
    renderProfile();
  });

  skipButton.addEventListener("click", () => {
    if (index >= profiles.length) return;
    matchInfo.textContent = "Profil přeskočen.";
    index += 1;
    renderProfile();
  });

  renderProfile();
  buttonRow.append(likeButton, skipButton);
  wrapper.append(card, buttonRow, matchInfo);
  return wrapper;
};

const buildRatingsDemo = () => {
  const sellers = [
    { name: "TechStore", rating: 4.6, votes: 24 },
    { name: "BikeHub", rating: 4.2, votes: 12 },
    { name: "VintageRoom", rating: 4.8, votes: 31 },
  ];

  const wrapper = createElement("div");
  const list = createElement("div", "card-grid");

  const renderSellers = () => {
    list.innerHTML = "";
    sellers.forEach((seller) => {
      const card = createElement("div", "card");
      card.append(createElement("h3", null, seller.name));
      const ratingText = createElement("p", "hint", `${seller.rating.toFixed(1)} / 5 (${seller.votes} hlasů)`);
      const stars = createElement("div", "stars");
      for (let i = 1; i <= 5; i += 1) {
        const star = createButton("★", "star-button");
        if (i <= Math.round(seller.rating)) {
          star.classList.add("active");
        }
        star.addEventListener("click", () => {
          seller.rating = (seller.rating * seller.votes + i) / (seller.votes + 1);
          seller.votes += 1;
          renderSellers();
        });
        stars.append(star);
      }
      card.append(ratingText, stars);
      list.append(card);
    });
  };

  renderSellers();
  wrapper.append(list);
  return wrapper;
};

const buildTinderAdsDemo = () => {
  const ads = [
    { title: "Šatní skříň 3d", price: 2500, location: "Kladno" },
    { title: "Notebook Lenovo", price: 8900, location: "Plzeň" },
    { title: "Koloběžka", price: 1900, location: "Olomouc" },
  ];
  let index = 0;
  const liked = [];
  const skipped = [];
  const history = [];

  const wrapper = createElement("div");
  const card = createElement("div", "ad-card");
  const stats = createElement("div", "stats");
  const likeStat = createElement("strong", null, "0");
  const skipStat = createElement("strong", null, "0");
  const likeBox = createElement("div", "stat");
  likeBox.append(createElement("span", null, "Líbí"), likeStat);
  const skipBox = createElement("div", "stat");
  skipBox.append(createElement("span", null, "Ne"), skipStat);
  stats.append(likeBox, skipBox);

  const buttonRow = createElement("div", "action-row");
  const likeButton = createButton("Líbí");
  const skipButton = createButton("Nelíbí", "button secondary");
  const undoButton = createButton("Vrátit", "button ghost");

  const renderCard = () => {
    card.innerHTML = "";
    if (index >= ads.length) {
      card.append(createElement("h3", null, "Konec nabídky"));
      card.append(createElement("p", null, "Projeli jste všechny inzeráty."));
      likeButton.disabled = true;
      skipButton.disabled = true;
      undoButton.disabled = history.length === 0;
      return;
    }
    const ad = ads[index];
    card.append(createElement("h3", null, ad.title));
    card.append(createElement("p", "price", `${ad.price.toLocaleString("cs-CZ")} Kč`));
    card.append(createElement("p", "hint", ad.location));
    card.append(createElement("span", "tag", `Karta ${index + 1}/${ads.length}`));
  };

  const updateStats = () => {
    likeStat.textContent = liked.length.toString();
    skipStat.textContent = skipped.length.toString();
    undoButton.disabled = history.length === 0;
  };

  const register = (action) => {
    if (index >= ads.length) return;
    const ad = ads[index];
    if (action === "like") liked.push(ad);
    if (action === "skip") skipped.push(ad);
    history.push({ action, ad });
    index += 1;
    renderCard();
    updateStats();
  };

  likeButton.addEventListener("click", () => register("like"));
  skipButton.addEventListener("click", () => register("skip"));
  undoButton.addEventListener("click", () => {
    const last = history.pop();
    if (!last) return;
    index -= 1;
    if (last.action === "like") liked.pop();
    if (last.action === "skip") skipped.pop();
    renderCard();
    updateStats();
  });

  renderCard();
  updateStats();
  buttonRow.append(likeButton, skipButton, undoButton);
  wrapper.append(card, buttonRow, stats);
  return wrapper;
};

const slides = [
  {
    id: "02",
    title: "Nabídky",
    description: "Komplexní vyhledávání a filtrování nabídek podle ceny, kategorie a dopravy.",
    build: buildOffersDemo,
  },
  {
    id: "03",
    title: "Duolingo",
    description: "Mini jazykový trenažér se skóre, sérií a dynamickými otázkami.",
    build: buildDuolingoDemo,
  },
  {
    id: "04",
    title: "Poptávky",
    description: "Správa poptávek s prioritami a změnou stavu podle průběhu zakázky.",
    build: buildRequestsDemo,
  },
  {
    id: "05",
    title: "Nabídky brigád",
    description: "Seznam brigád s filtrováním, řazením a počítáním přihlášek.",
    build: buildJobsDemo,
  },
  {
    id: "06",
    title: "Chat",
    description: "Základní chat s bot odpověďmi a indikátorem psaní.",
    build: buildChatDemo,
  },
  {
    id: "07",
    title: "Aukce/dražba",
    description: "Simulace aukce s časovačem, příhozy a historií nabídek.",
    build: buildAuctionDemo,
  },
  {
    id: "08",
    title: "Komentáře",
    description: "Komentáře s přidáváním, liky a nahlášením.",
    build: buildCommentsDemo,
  },
  {
    id: "09",
    title: "Liky",
    description: "Líbí/nelíbí systém s celkovým počtem a stavem jednotlivých položek.",
    build: buildLikesDemo,
  },
  {
    id: "10",
    title: "Seznamka",
    description: "Matchovací karta s možností líbit/přeskočit a evidencí shod.",
    build: buildDatingDemo,
  },
  {
    id: "11",
    title: "Hodnocení sellerů",
    description: "Hvězdičkové hodnocení s přepočtem průměru v reálném čase.",
    build: buildRatingsDemo,
  },
  {
    id: "12",
    title: "Tinder s inzeraty",
    description: "Swipe-like průchod inzeráty s možností vrátit poslední akci.",
    build: buildTinderAdsDemo,
  },
];

slides.forEach((slide) => main.appendChild(createSlide(slide)));

app.append(hero, main);
