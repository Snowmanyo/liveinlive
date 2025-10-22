import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Music,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Upload,
  Search,
  Star,
} from "lucide-react";

const ConcertDashboard = () => {
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [fileError, setFileError] = useState(false);
  const [selectedYear, setSelectedYear] = useState("all");
  const [performerSortBy, setPerformerSortBy] = useState("count");
  const [performerTypeFilter, setPerformerTypeFilter] = useState("all");
  const [venueSubTab, setVenueSubTab] = useState("stats");
  const [timelineSubTab, setTimelineSubTab] = useState("review");
  const [calendarView, setCalendarView] = useState("month");
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);
  const [ticketImages, setTicketImages] = useState({});
  const [showTicketSelector, setShowTicketSelector] = useState(false);
  const [ticketSearchQuery, setTicketSearchQuery] = useState("");
  const [calendarYear, setCalendarYear] = useState(
    new Date().getFullYear().toString()
  );
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [highlights, setHighlights] = useState({});
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(
      () => setNotification({ show: false, message: "", type: "success" }),
      3000
    );
  };

  useEffect(() => {
    loadData();
    loadHighlights();
    loadTicketImages();
  }, []);

  const loadTicketImages = () => {
    try {
      const saved = localStorage.getItem("ticketImages");
      if (saved) {
        setTicketImages(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading ticket images:", error);
    }
  };

  const saveTicketImages = (images) => {
    try {
      localStorage.setItem("ticketImages", JSON.stringify(images));
    } catch (error) {
      console.error("Error saving ticket images:", error);
    }
  };

  const handleTicketImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const concertKey = `${currentConcert["場次"]}-${currentConcert["表演者"]}-${currentConcert["Live Tour"]}`;
        const newImages = { ...ticketImages, [concertKey]: e.target.result };
        setTicketImages(newImages);
        saveTicketImages(newImages);
      };
      reader.readAsDataURL(file);
      event.target.value = "";
    }
  };

  const getCurrentTicketImage = () => {
    const concertKey = `${currentConcert["場次"]}-${currentConcert["表演者"]}-${currentConcert["Live Tour"]}`;
    return ticketImages[concertKey];
  };

  const loadData = async () => {
    try {
      const savedData = await loadFromIndexedDB();
      if (savedData && savedData.length > 0) {
        setConcerts(savedData);
        setLoading(false);
        setFileError(false);
        validateHighlights(savedData);
        return;
      }
      const response = await fetch("/演唱會場次.csv");
      const fileContent = await response.text();
      parseCSV(fileContent);
    } catch (error) {
      console.error("Error loading file:", error);
      setFileError(true);
      setLoading(false);
    }
  };

  const loadHighlights = () => {
    try {
      const saved = localStorage.getItem("concertHighlights");
      if (saved) {
        setHighlights(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading highlights:", error);
    }
  };

  const saveHighlights = (newHighlights) => {
    try {
      localStorage.setItem("concertHighlights", JSON.stringify(newHighlights));
    } catch (error) {
      console.error("Error saving highlights:", error);
    }
  };

  const validateHighlights = (concertData) => {
    const saved = localStorage.getItem("concertHighlights");
    if (!saved) return;

    try {
      const savedHighlights = JSON.parse(saved);
      const validatedHighlights = {};

      Object.keys(savedHighlights).forEach((key) => {
        const concert = savedHighlights[key];
        if (concert) {
          const exists = concertData.find(
            (c) =>
              c["場次"] === concert["場次"] &&
              c["表演者"] === concert["表演者"] &&
              c["Live Tour"] === concert["Live Tour"]
          );
          if (exists) {
            validatedHighlights[key] = exists;
          }
        }
      });

      setHighlights(validatedHighlights);
      saveHighlights(validatedHighlights);
    } catch (error) {
      console.error("Error validating highlights:", error);
    }
  };

  const loadFromIndexedDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("ConcertDB", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("concerts")) {
          resolve(null);
          return;
        }
        const transaction = db.transaction(["concerts"], "readonly");
        const store = transaction.objectStore("concerts");
        const getRequest = store.get("concertData");
        getRequest.onsuccess = () => resolve(getRequest.result?.data || null);
        getRequest.onerror = () => reject(getRequest.error);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("concerts")) {
          db.createObjectStore("concerts");
        }
      };
    });
  };

  const saveToIndexedDB = (data) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("ConcertDB", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(["concerts"], "readwrite");
        const store = transaction.objectStore("concerts");
        const putRequest = store.put({ data }, "concertData");
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("concerts")) {
          db.createObjectStore("concerts");
        }
      };
    });
  };

  const clearIndexedDB = async () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase("ConcertDB");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Database deletion blocked"));
    });
  };

  const parseCSV = async (content) => {
    try {
      const lines = content.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim());
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const values = [];
        let current = "";
        let inQuotes = false;

        for (let j = 0; j < lines[i].length; j++) {
          const char = lines[i][j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const obj = {};
        headers.forEach((header, idx) => {
          obj[header] = (values[idx] || "").replace(/^"|"$/g, "");
        });

        obj.priceNumeric =
          parseFloat((obj["票價"] || "0").replace(/,/g, "").trim()) || 0;
        const yearMatch = obj["日期"] ? obj["日期"].match(/(\d{4})年/) : null;
        obj.year = yearMatch ? yearMatch[1] : "未知";
        const monthMatch = obj["日期"]
          ? obj["日期"].match(/(\d{4})年(\d{1,2})月/)
          : null;
        obj.yearMonth = monthMatch
          ? `${monthMatch[1]}-${monthMatch[2].padStart(2, "0")}`
          : null;

        // 轉換日期格式為 yyyy/mm/dd
        const fullDateMatch = obj["日期"]
          ? obj["日期"].match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
          : null;
        if (fullDateMatch) {
          obj.displayDate = `${fullDateMatch[1]}/${fullDateMatch[2].padStart(
            2,
            "0"
          )}/${fullDateMatch[3].padStart(2, "0")}`;
        } else {
          obj.displayDate = obj["日期"] || "";
        }

        data.push(obj);
      }

      setConcerts(data);
      setLoading(false);
      setFileError(false);
      await saveToIndexedDB(data);
      validateHighlights(data);
    } catch (error) {
      console.error("Error in parseCSV:", error);
      setLoading(false);
      throw error;
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          await parseCSV(e.target.result);
          showNotification("資料上傳成功！已自動儲存", "success");
        } catch (error) {
          showNotification("檔案解析失敗，請確認 CSV 格式正確", "error");
          setLoading(false);
        }
      };
      reader.onerror = () => {
        showNotification("檔案讀取失敗，請重試", "error");
        setLoading(false);
      };
      reader.readAsText(file, "UTF-8");
      event.target.value = "";
    }
  };

  if (fileError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl p-8 text-center shadow-xl border border-gray-100">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Upload className="w-10 h-10 text-gray-600" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-light text-gray-900 mb-2">
              尚未載入資料
            </h2>
            <p className="text-gray-500 font-light mb-8">
              請上傳你的演唱會記錄 CSV 檔案
            </p>
            <label className="inline-block px-8 py-3 bg-gray-900 text-white rounded-xl cursor-pointer hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              選擇檔案
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-gray-800 text-xl font-light">載入中...</div>
      </div>
    );
  }

  const totalConcerts = concerts.length;
  const totalSpent = concerts.reduce((sum, c) => sum + c.priceNumeric, 0);
  const soloCount = concerts.filter((c) => c["類型"] === "專場").length;
  const filteredByYear =
    selectedYear === "all"
      ? concerts
      : concerts.filter((c) => c.year === selectedYear);

  const performerMap = {};
  filteredByYear.forEach((c) => {
    const performers = (c["表演者"] || "未知")
      .split(/[,、]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const isSolo = c["類型"] === "專場";
    performers.forEach((name) => {
      if (!performerMap[name]) {
        performerMap[name] = {
          soloCount: 0,
          festivalCount: 0,
          soloSpent: 0,
          festivalSpent: 0,
        };
      }
      if (isSolo) {
        performerMap[name].soloCount++;
        performerMap[name].soloSpent += c.priceNumeric;
      } else {
        performerMap[name].festivalCount++;
        performerMap[name].festivalSpent += c.priceNumeric;
      }
    });
  });

  const performerStats = Object.entries(performerMap)
    .map(([name, data]) => ({
      name,
      soloCount: data.soloCount,
      festivalCount: data.festivalCount,
      totalCount: data.soloCount + data.festivalCount,
      soloSpent: data.soloSpent,
      festivalSpent: data.festivalSpent,
      totalSpent: data.soloSpent + data.festivalSpent,
      soloAverage:
        data.soloCount > 0 ? Math.round(data.soloSpent / data.soloCount) : 0,
      festivalAverage:
        data.festivalCount > 0
          ? Math.round(data.festivalSpent / data.festivalCount)
          : 0,
    }))
    .filter((p) => p.name !== "null" && p.name !== "未知" && p.name !== "")
    .filter((p) => {
      if (performerTypeFilter === "solo") return p.soloCount > 0;
      if (performerTypeFilter === "festival") return p.festivalCount > 0;
      return true;
    })
    .sort((a, b) => {
      const sortMap = {
        count: b.totalCount - a.totalCount,
        soloCount: b.soloCount - a.soloCount,
        festivalCount: b.festivalCount - a.festivalCount,
        spent: b.totalSpent - a.totalSpent,
        soloSpent: b.soloSpent - a.soloSpent,
        festivalSpent: b.festivalSpent - a.festivalSpent,
      };
      return sortMap[performerSortBy] || 0;
    })
    .slice(0, 10);

  const locationMap = {};
  filteredByYear.forEach((c) => {
    const loc = c["地點"] || "未知";
    if (loc && loc !== "null" && loc !== "未知") {
      locationMap[loc] = (locationMap[loc] || 0) + 1;
    }
  });
  const locationStats = Object.entries(locationMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const venueMap = {};
  filteredByYear.forEach((c) => {
    const venue = c["場地"] || "未知";
    if (venue && venue !== "null" && venue !== "未知") {
      venueMap[venue] = (venueMap[venue] || 0) + 1;
    }
  });
  const venueStats = Object.entries(venueMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const guestMap = {};
  concerts.forEach((c) => {
    const guestStr = c["嘉賓"];
    if (
      guestStr &&
      guestStr !== "無" &&
      guestStr !== "null" &&
      guestStr !== "未知" &&
      guestStr.trim() !== ""
    ) {
      const guests = guestStr
        .split(/[,、+&/]/)
        .map((g) => g.trim())
        .filter((g) => g.length > 0);
      guests.forEach((guest) => {
        if (guest !== "無") {
          if (!guestMap[guest]) {
            guestMap[guest] = { count: 0, concerts: [] };
          }
          guestMap[guest].count++;
          guestMap[guest].concerts.push({
            date: c.displayDate || c["日期"],
            performer: c["表演者"],
            tour: c["Live Tour"],
            type: c["類型"],
          });
        }
      });
    }
  });
  const guestStats = Object.entries(guestMap)
    .map(([name, data]) => ({
      name,
      count: data.count,
      concerts: data.concerts,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const yearMap = {};
  concerts.forEach((c) => {
    const year = c.year;
    if (year !== "未知") {
      if (!yearMap[year]) yearMap[year] = { count: 0, spent: 0 };
      yearMap[year].count++;
      yearMap[year].spent += c.priceNumeric;
    }
  });
  const yearStats = Object.entries(yearMap)
    .map(([year, data]) => ({ year, count: data.count, spent: data.spent }))
    .sort((a, b) => a.year.localeCompare(b.year));
  const availableYears = ["all", ...Object.keys(yearMap).sort()];

  const monthMap = {};
  filteredByYear.forEach((c) => {
    if (c.yearMonth) {
      if (!monthMap[c.yearMonth])
        monthMap[c.yearMonth] = { count: 0, spent: 0 };
      monthMap[c.yearMonth].count++;
      monthMap[c.yearMonth].spent += c.priceNumeric;
    }
  });
  const monthStats = Object.entries(monthMap)
    .map(([month, data]) => ({ month, count: data.count, spent: data.spent }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const COLORS = [
    "#9ca3af",
    "#a8b4c3",
    "#b5a99c",
    "#c4b5a0",
    "#a8a99e",
    "#b9b3a8",
    "#a6a8a5",
    "#b7bab8",
  ];
  const filteredConcerts = concerts.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return ["表演者", "Live Tour", "地點", "場地", "日期"].some(
      (field) => c[field] && c[field].toLowerCase().includes(term)
    );
  });

  const getCalendarYears = () => Object.keys(yearMap).sort();
  const getDaysInMonth = (year, month) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  const getConcertsForDate = (year, month, day) => {
    return concerts.filter((c) => {
      const dateMatch = c["日期"]
        ? c["日期"].match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
        : null;
      if (!dateMatch) return false;
      return (
        parseInt(dateMatch[1]) === parseInt(year) &&
        parseInt(dateMatch[2]) === month + 1 &&
        parseInt(dateMatch[3]) === day
      );
    });
  };

  const monthNames = [
    "一月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月",
  ];
  const monthNamesEn = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const dayNames = ["日", "一", "二", "三", "四", "五", "六"];

  const currentConcert = concerts[currentTicketIndex] || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {notification.show && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
          <div
            className={`rounded-lg shadow-xl px-4 py-3 flex items-center gap-2 pointer-events-auto ${
              notification.type === "success"
                ? "bg-green-500 text-white"
                : notification.type === "error"
                ? "bg-red-500 text-white"
                : "bg-yellow-500 text-white"
            }`}
          >
            <span className="text-xl">
              {notification.type === "success"
                ? "✓"
                : notification.type === "error"
                ? "✗"
                : "⚠"}
            </span>
            <span className="font-medium text-sm">{notification.message}</span>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">⚠️</span>
              <h3 className="text-xl font-medium text-gray-900">
                確認清除資料
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              是否確定清除所有資料？
              <br />
              清除後需要重新上傳檔案才能使用。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  setShowConfirmModal(false);
                  try {
                    setLoading(true);
                    await clearIndexedDB();
                    setConcerts([]);
                    setFileError(true);
                    setLoading(false);
                    showNotification(
                      "資料已清除成功！請重新上傳 CSV 檔案",
                      "success"
                    );
                  } catch (error) {
                    setLoading(false);
                    showNotification(
                      "清除資料時發生錯誤，請重新整理頁面後再試",
                      "error"
                    );
                  }
                }}
                className="px-6 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
              >
                確認清除
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Music
                  className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                  strokeWidth={2}
                />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-light text-gray-900 tracking-wide">
                  Concert Archive
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 font-light">
                  我的演唱會收藏
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="px-3 sm:px-5 py-2 sm:py-2.5 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-all text-xs sm:text-sm font-light text-gray-700 shadow-sm hover:shadow flex items-center gap-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-4 h-4" />
                重新上傳
              </label>
              <button
                onClick={() => setShowConfirmModal(true)}
                className="px-3 sm:px-5 py-2 sm:py-2.5 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-all text-xs sm:text-sm font-light shadow-sm hover:shadow"
              >
                清除資料
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
          {[
            {
              value: totalConcerts,
              icon: Calendar,
              label: "總場次",
              sublabel: soloCount > 0 ? `專場 ${soloCount} 場` : null,
            },
            {
              value: totalSpent.toLocaleString(),
              icon: DollarSign,
              label: "總花費",
              sublabel: null,
            },
            {
              value: Object.keys(performerMap).filter(
                (k) => k !== "null" && k !== ""
              ).length,
              icon: Users,
              label: "不同藝人",
              sublabel:
                soloCount > 0
                  ? `專場 ${
                      Object.keys(performerMap).filter(
                        (k) =>
                          k !== "null" &&
                          k !== "" &&
                          performerMap[k].soloCount > 0
                      ).length
                    } 位`
                  : null,
            },
            {
              value: Object.keys(locationMap).length,
              icon: MapPin,
              label: "跑過城市",
              sublabel: null,
            },
          ].map((card, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-white to-gray-50 border border-gray-200/50 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm hover:shadow-lg transition-all min-h-[120px] sm:min-h-[140px] flex items-center justify-center"
            >
              <div className="flex flex-col items-center justify-center text-center space-y-1 sm:space-y-2 w-full">
                <p className="text-2xl sm:text-3xl lg:text-4xl font-light text-gray-900">
                  {card.value}
                </p>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <card.icon
                    className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600"
                    strokeWidth={2}
                  />
                </div>
                <p className="text-gray-500 text-[10px] sm:text-xs font-medium uppercase tracking-wide">
                  {card.label}
                </p>
                {card.sublabel && (
                  <p className="text-gray-400 text-[9px] sm:text-[10px]">
                    {card.sublabel}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 w-full">
          <div className="flex gap-2 p-1 bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-x-auto w-full sm:w-auto">
            {[
              ["overview", "總覽"],
              ["timeline", "時間軸"],
              ["venues", "場館"],
              ["performers", "表演者"],
              ["guests", "嘉賓"],
              ["highlights", "演唱會之最"],
              ["tickets", "票卡"],
              ["list", "詳細列表"],
            ].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-3 sm:px-5 py-2 sm:py-2.5 font-light text-xs sm:text-sm transition-all whitespace-nowrap rounded-xl flex-1 sm:flex-initial ${
                  selectedTab === tab
                    ? "bg-gray-900 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {selectedTab === "overview" && (
          <div className="pb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-medium text-gray-900">數據總覽</h2>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-light text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 shadow-sm"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year === "all" ? "所有年份" : `${year}年`}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-200/50">
                <h3 className="text-lg font-medium text-gray-900 mb-6">
                  歷年場次趨勢
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={yearStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      stroke="#6b7280"
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#a8b4c3"
                      strokeWidth={3}
                      name="場次"
                      dot={{ r: 5, fill: "#a8b4c3" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-200/50">
                <h3 className="text-lg font-medium text-gray-900 mb-6">
                  城市分布
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={locationStats}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={{ stroke: "#9ca3af", strokeWidth: 1 }}
                    >
                      {locationStats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-200/50 lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-6">
                  每月場次趨勢
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      stroke="#6b7280"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      style={{ fontSize: "10px" }}
                    />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#b5a99c"
                      strokeWidth={3}
                      name="場次"
                      dot={{ r: 4, fill: "#b5a99c" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {selectedTab === "performers" && (
          <div className="pb-12">
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-200/50">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    表演者統計 Top 10
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    專場與拼盤分開統計
                  </p>
                </div>
                <div className="flex gap-3">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year === "all" ? "所有年份" : `${year}年`}
                      </option>
                    ))}
                  </select>
                  <select
                    value={performerTypeFilter}
                    onChange={(e) => setPerformerTypeFilter(e.target.value)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="all">全部類型</option>
                    <option value="solo">僅專場</option>
                    <option value="festival">僅拼盤</option>
                  </select>
                  <select
                    value={performerSortBy}
                    onChange={(e) => setPerformerSortBy(e.target.value)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                  >
                    <option value="count">依總場次排序</option>
                    <option value="soloCount">依專場場次排序</option>
                    <option value="festivalCount">依拼盤場次排序</option>
                    <option value="spent">依總花費排序</option>
                    <option value="soloSpent">依專場花費排序</option>
                    <option value="festivalSpent">依拼盤花費排序</option>
                  </select>
                </div>
              </div>
              {performerTypeFilter === "all" ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {performerStats.map((performer, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <h3 className="text-xl font-medium text-gray-900">
                              {performer.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                              總計 {performer.totalCount} 場 · NT${" "}
                              {performer.totalSpent.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            <h4 className="text-sm font-medium text-blue-900">
                              專場
                            </h4>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                場次
                              </span>
                              <span className="font-medium text-gray-900">
                                {performer.soloCount} 場
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                總花費
                              </span>
                              <span className="font-medium text-gray-900 text-sm">
                                {performer.soloSpent > 0
                                  ? `NT$ ${performer.soloSpent.toLocaleString()}`
                                  : "-"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                平均票價
                              </span>
                              <span className="text-sm text-gray-700">
                                {performer.soloAverage > 0
                                  ? `NT$ ${performer.soloAverage.toLocaleString()}`
                                  : "-"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                            <h4 className="text-sm font-medium text-orange-900">
                              拼盤
                            </h4>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                場次
                              </span>
                              <span className="font-medium text-gray-900">
                                {performer.festivalCount} 場
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                總花費
                              </span>
                              <span className="font-medium text-gray-900 text-sm">
                                {performer.festivalSpent > 0
                                  ? `NT$ ${performer.festivalSpent.toLocaleString()}`
                                  : "-"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">
                                平均票價
                              </span>
                              <span className="text-sm text-gray-700">
                                {performer.festivalAverage > 0
                                  ? `NT$ ${performer.festivalAverage.toLocaleString()}`
                                  : "-"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-center p-4 text-sm font-medium text-gray-700 w-20">
                          排名
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-gray-700">
                          表演者
                        </th>
                        <th className="text-center p-4 text-sm font-medium text-gray-700">
                          場次
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-gray-700">
                          總花費
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-gray-700">
                          平均票價
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {performerStats.map((performer, idx) => {
                        const isSoloFilter = performerTypeFilter === "solo";
                        const count = isSoloFilter
                          ? performer.soloCount
                          : performer.festivalCount;
                        const spent = isSoloFilter
                          ? performer.soloSpent
                          : performer.festivalSpent;
                        const average = isSoloFilter
                          ? performer.soloAverage
                          : performer.festivalAverage;
                        const bgColor = isSoloFilter
                          ? "bg-blue-50"
                          : "bg-orange-50";
                        const badgeBg = isSoloFilter
                          ? "bg-blue-100"
                          : "bg-orange-100";
                        const textColor = isSoloFilter
                          ? "text-blue-800"
                          : "text-orange-800";
                        return (
                          <tr
                            key={idx}
                            className={`border-b border-gray-100 hover:${bgColor} transition-colors`}
                          >
                            <td className="text-center p-4">
                              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white text-sm font-bold mx-auto">
                                {idx + 1}
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="font-medium text-gray-900 whitespace-nowrap">
                                {performer.name}
                              </p>
                            </td>
                            <td className="text-center p-4">
                              <span
                                className={`inline-block ${badgeBg} ${textColor} px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap`}
                              >
                                {count} 場
                              </span>
                            </td>
                            <td className="text-right p-4">
                              <p className="font-medium text-gray-900 whitespace-nowrap">
                                {spent > 0
                                  ? `NT$ ${spent.toLocaleString()}`
                                  : "-"}
                              </p>
                            </td>
                            <td className="text-right p-4">
                              <p className="text-gray-600 whitespace-nowrap">
                                {average > 0
                                  ? `NT$ ${average.toLocaleString()}`
                                  : "-"}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === "guests" && (
          <div className="pb-12">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200/50">
              <h2 className="text-lg font-medium text-gray-900 mb-8">
                嘉賓統計 Top 10
              </h2>
              {guestStats.length > 0 ? (
                <>
                  <div className="mb-8">
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={guestStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          type="number"
                          stroke="#6b7280"
                          style={{ fontSize: "12px" }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={120}
                          stroke="#6b7280"
                          style={{ fontSize: "11px" }}
                          interval={0}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="count"
                          fill="#c4b5a0"
                          name="出現次數"
                          radius={[0, 8, 8, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {guestStats.map((guest, idx) => (
                      <div
                        key={idx}
                        className="bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-help hover:shadow-lg transition-all relative group"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate flex-1">
                            {guest.name}
                          </p>
                          <span className="ml-2 bg-amber-600 text-white px-2 py-1 rounded-lg text-xs font-bold">
                            {guest.count}次
                          </span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 transition-opacity duration-200 z-50 pointer-events-none">
                          <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs shadow-xl min-w-max max-w-xs max-h-48 overflow-y-auto">
                            <div className="space-y-1.5">
                              {guest.concerts.map((concert, cidx) => (
                                <div
                                  key={cidx}
                                  className="text-left whitespace-nowrap"
                                >
                                  <span className="font-medium">
                                    {concert.date}
                                  </span>
                                  {concert.type === "專場" &&
                                    concert.performer && (
                                      <span className="text-gray-300">
                                        {" "}
                                        {concert.performer}
                                      </span>
                                    )}
                                  {concert.tour && (
                                    <span className="text-gray-300">
                                      {" "}
                                      {concert.tour}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                              <div className="border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>目前沒有嘉賓記錄</p>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === "highlights" && (
          <div className="pb-12">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200/50">
              <h2 className="text-lg font-medium text-gray-900 mb-8">
                演唱會之最 🌟
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    key: "mostImpressive",
                    title: "氣氛最好的",
                    icon: "🌟",
                    color: "yellow",
                  },
                  {
                    key: "mostExpensive",
                    title: "最貴的",
                    icon: "💰",
                    color: "red",
                  },
                  {
                    key: "mostImmersive",
                    title: "最沉浸的",
                    icon: "🎭",
                    color: "blue",
                  },
                  {
                    key: "mostEnergetic",
                    title: "戎斷最強的",
                    icon: "💪",
                    color: "green",
                  },
                  {
                    key: "bestExperience",
                    title: "體驗感最好的",
                    icon: "⭐",
                    color: "purple",
                  },
                  {
                    key: "bestLocation",
                    title: "位置最棒的",
                    icon: "📍",
                    color: "pink",
                  },
                  {
                    key: "mostSurprising",
                    title: "最超出預期的",
                    icon: "🎉",
                    color: "indigo",
                  },
                  {
                    key: "bestValue",
                    title: "CP值最高的",
                    icon: "🏆",
                    color: "orange",
                  },
                  {
                    key: "mostMemorable",
                    title: "最常回想的",
                    icon: "💭",
                    color: "teal",
                  },
                ].map((question) => {
                  const colorClasses = {
                    yellow: "from-yellow-50 to-yellow-100 border-yellow-200",
                    red: "from-red-50 to-red-100 border-red-200",
                    blue: "from-blue-50 to-blue-100 border-blue-200",
                    green: "from-green-50 to-green-100 border-green-200",
                    purple: "from-purple-50 to-purple-100 border-purple-200",
                    pink: "from-pink-50 to-pink-100 border-pink-200",
                    indigo: "from-indigo-50 to-indigo-100 border-indigo-200",
                    orange: "from-orange-50 to-orange-100 border-orange-200",
                  };
                  const selectedConcert = highlights[question.key];
                  const isEditing = editingQuestion === question.key;
                  return (
                    <div
                      key={question.key}
                      className={`bg-gradient-to-br ${
                        colorClasses[question.color]
                      } border rounded-xl p-6`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                          <span className="text-2xl">{question.icon}</span>
                          {question.title}
                        </h3>
                      </div>
                      {!selectedConcert && !isEditing && (
                        <button
                          onClick={() => setEditingQuestion(question.key)}
                          className="w-full py-3 bg-white border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                        >
                          <span className="text-xl">+</span>選擇演唱會
                        </button>
                      )}
                      {selectedConcert && !isEditing && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="space-y-2">
                            <p className="font-medium text-gray-900">
                              {selectedConcert["表演者"]}
                            </p>
                            <p className="text-sm text-gray-600">
                              {selectedConcert["Live Tour"]}
                            </p>
                            <p className="text-xs text-gray-500">
                              {selectedConcert.displayDate ||
                                selectedConcert["日期"]}{" "}
                              · {selectedConcert["地點"]}
                            </p>
                          </div>
                          <button
                            onClick={() => setEditingQuestion(question.key)}
                            className="mt-3 text-xs text-gray-600 hover:text-gray-900 underline"
                          >
                            更改
                          </button>
                        </div>
                      )}
                      {isEditing && (
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="搜尋表演者、演唱會名稱、日期..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto space-y-2 bg-white rounded-lg border border-gray-200 p-2">
                            {concerts
                              .filter((c) => {
                                if (!searchQuery) return true;
                                const query = searchQuery.toLowerCase();
                                return [
                                  "表演者",
                                  "Live Tour",
                                  "日期",
                                  "地點",
                                ].some(
                                  (field) =>
                                    c[field] &&
                                    c[field].toLowerCase().includes(query)
                                );
                              })
                              .slice(0, 20)
                              .map((concert, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    const newHighlights = {
                                      ...highlights,
                                      [question.key]: concert,
                                    };
                                    setHighlights(newHighlights);
                                    saveHighlights(newHighlights);
                                    setEditingQuestion(null);
                                    setSearchQuery("");
                                  }}
                                  className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-all border border-transparent hover:border-gray-200"
                                >
                                  <p className="font-medium text-sm text-gray-900">
                                    {concert["表演者"]}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {concert["Live Tour"]}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {concert.displayDate || concert["日期"]} ·{" "}
                                    {concert["地點"]}
                                  </p>
                                </button>
                              ))}
                          </div>
                          <button
                            onClick={() => {
                              setEditingQuestion(null);
                              setSearchQuery("");
                            }}
                            className="w-full py-2 text-sm text-gray-600 hover:text-gray-900"
                          >
                            取消
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {selectedTab === "tickets" && (
          <div className="pb-12">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200/50">
              <h2 className="text-lg font-medium text-gray-900 mb-8">
                演唱會票卡
              </h2>
              <div className="max-w-5xl mx-auto">
                <div className="relative">
                  {/* 雙面票卡 */}
                  <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
                    {/* 正面 - 演唱會海報 */}
                    <div className="relative w-full max-w-[360px] aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200 group flex-shrink-0">
                      {getCurrentTicketImage() ? (
                        <>
                          <img
                            src={getCurrentTicketImage()}
                            alt="Concert Poster"
                            className="w-full h-full object-cover"
                          />
                          <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex flex-col items-center justify-center gap-3">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleTicketImageUpload}
                              className="hidden"
                            />
                            <Upload className="w-12 h-12 text-white" />
                            <span className="text-white font-medium">
                              更換封面圖
                            </span>
                          </label>
                        </>
                      ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors gap-4">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleTicketImageUpload}
                            className="hidden"
                          />
                          <Upload className="w-16 h-16 text-gray-400" />
                          <div className="text-center px-8">
                            <p className="text-lg font-medium text-gray-600 mb-2">
                              上傳演唱會封面圖
                            </p>
                            <p className="text-sm text-gray-500">
                              建議尺寸 3:4 比例
                            </p>
                          </div>
                        </label>
                      )}
                    </div>

                    {/* 背面 - 票券資訊 */}
                    <div
                      className="relative w-full max-w-[360px] aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl flex-shrink-0"
                      style={{
                        background: getCurrentTicketImage()
                          ? `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%), url(${getCurrentTicketImage()})`
                          : "#ffffff",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {/* 漸層遮罩（僅在有圖片時） */}
                      {getCurrentTicketImage() && (
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 via-amber-300/20 to-yellow-400/20"></div>
                      )}

                      <div className="relative h-full flex flex-col p-8">
                        {/* 頂部 logo 區 */}
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg">
                              <Music className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setShowTicketSelector(!showTicketSelector)
                            }
                            className="text-sm text-gray-700 font-medium bg-white/90 hover:bg-white px-3 py-1 rounded-full shadow-md transition-all cursor-pointer"
                          >
                            {currentTicketIndex + 1} / {concerts.length}
                          </button>
                        </div>

                        {/* 演唱會名稱 */}
                        <div className="mb-6">
                          <h3 className="text-3xl font-bold text-gray-900 mb-3 leading-tight drop-shadow-sm">
                            {currentConcert["Live Tour"] || ""}
                          </h3>
                          <p className="text-xl font-medium text-gray-800">
                            {currentConcert["表演者"] || ""}
                          </p>
                        </div>

                        {/* 資訊卡片 */}
                        <div className="flex-1 flex items-center">
                          <div className="w-full bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200">
                            <div className="space-y-4">
                              <div>
                                <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                                  Date & Time
                                </p>
                                <p className="text-lg font-bold text-gray-900">
                                  {currentConcert.displayDate ||
                                    currentConcert["日期"] ||
                                    ""}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                                  Venue
                                </p>
                                <p className="text-base font-bold text-gray-900">
                                  {currentConcert["場地"] || ""}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                                    Location
                                  </p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {currentConcert["地點"] || ""}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                                    Seat
                                  </p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {currentConcert["座位"] || ""}
                                  </p>
                                </div>
                              </div>

                              <div className="pt-4 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                                  Price
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                  NT${" "}
                                  {(
                                    currentConcert.priceNumeric || 0
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 底部提示文字 */}
                        <div className="mt-4 text-center">
                          <p className="text-xs text-gray-600 drop-shadow-sm">
                            ★ 僅供個人收藏使用・僅為紀念性質 ★
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 票卡選擇器轉盤 - 3D 輪播效果 */}
                  {showTicketSelector && (
                    <div
                      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 overflow-y-auto"
                      onClick={() => setShowTicketSelector(false)}
                    >
                      <div
                        className="w-full max-w-6xl my-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-center mb-8 px-4">
                          <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                            選擇票卡
                          </h3>
                          <button
                            onClick={() => setShowTicketSelector(false)}
                            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 text-2xl shadow-lg hover:bg-gray-100 transition-all"
                          >
                            ×
                          </button>
                        </div>

                        {/* 3D 輪播容器 */}
                        <div
                          className="relative h-[500px] flex items-center justify-center"
                          style={{ perspective: "1200px" }}
                        >
                          <div
                            className="relative w-full h-full flex items-center justify-center"
                            style={{ transformStyle: "preserve-3d" }}
                          >
                            {concerts.map((concert, idx) => {
                              const concertKey = `${concert["場次"]}-${concert["表演者"]}-${concert["Live Tour"]}`;
                              const hasImage = ticketImages[concertKey];

                              const offset = idx - currentTicketIndex;
                              const absOffset = Math.abs(offset);

                              if (absOffset > 3) return null;

                              let translateX = offset * 280;
                              let translateZ = -absOffset * 200;
                              let scale = 1 - absOffset * 0.2;
                              let opacity = 1 - absOffset * 0.3;
                              let rotateY = offset * 15;

                              if (offset === 0) {
                                scale = 1.1;
                                translateZ = 50;
                                opacity = 1;
                              }

                              return (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setCurrentTicketIndex(idx);
                                  }}
                                  className="absolute transition-all duration-500 ease-out cursor-pointer"
                                  style={{
                                    transform: `translateX(${translateX}px) translateZ(${translateZ}px) scale(${scale}) rotateY(${rotateY}deg)`,
                                    opacity: opacity,
                                    zIndex: offset === 0 ? 50 : 50 - absOffset,
                                    width: "240px",
                                    height: "360px",
                                    transformStyle: "preserve-3d",
                                  }}
                                >
                                  <div
                                    className={`w-full h-full rounded-2xl overflow-hidden shadow-2xl border-4 transition-all ${
                                      offset === 0
                                        ? "border-blue-500"
                                        : "border-white"
                                    }`}
                                  >
                                    {hasImage ? (
                                      <img
                                        src={hasImage}
                                        alt={concert["Live Tour"]}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                        <Music className="w-16 h-16 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4">
                                      <p className="text-white text-sm font-bold truncate">
                                        {concert["表演者"]}
                                      </p>
                                      <p className="text-white/90 text-xs truncate">
                                        {concert["類型"] === "拼盤"
                                          ? `${
                                              concert.displayDate ||
                                              concert["日期"]
                                            } ${concert["Live Tour"]}`
                                          : `${
                                              concert.displayDate ||
                                              concert["日期"]
                                            } ${concert["表演者"]} ${
                                              concert["Live Tour"]
                                            }`}
                                      </p>
                                    </div>
                                    {offset === 0 && (
                                      <div className="absolute top-4 right-4 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                                        <span className="text-white text-sm font-bold">
                                          ✓
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 導航提示 */}
                        <div className="flex justify-center items-center gap-8 mt-8">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentTicketIndex((prev) =>
                                prev > 0 ? prev - 1 : concerts.length - 1
                              );
                            }}
                            className="px-6 py-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-gray-900 font-medium"
                          >
                            <span className="text-xl">←</span> 上一張
                          </button>
                          <div className="text-center">
                            <p className="text-lg font-bold text-white drop-shadow-lg">
                              {currentTicketIndex + 1} / {concerts.length}
                            </p>
                            <p className="text-sm text-white/80 mt-1 drop-shadow">
                              點擊卡片切換
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentTicketIndex((prev) =>
                                prev < concerts.length - 1 ? prev + 1 : 0
                              );
                            }}
                            className="px-6 py-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-gray-900 font-medium"
                          >
                            下一張 <span className="text-xl">→</span>
                          </button>
                        </div>

                        {/* 關閉提示 */}
                        <div className="text-center mt-6">
                          <p className="text-sm text-white/80 drop-shadow">
                            點擊背景或右上角 × 關閉
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 導航按鈕 */}
                  <div className="flex justify-between items-center mt-8 relative">
                    {/* 左側可點擊區域 */}
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[100px] h-[300px] -ml-[50px] cursor-pointer z-10"
                      onClick={() =>
                        setCurrentTicketIndex((prev) =>
                          prev > 0 ? prev - 1 : concerts.length - 1
                        )
                      }
                    />
                    {/* 右側可點擊區域 */}
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-[100px] h-[300px] -mr-[50px] cursor-pointer z-10"
                      onClick={() =>
                        setCurrentTicketIndex((prev) =>
                          prev < concerts.length - 1 ? prev + 1 : 0
                        )
                      }
                    />

                    <button
                      onClick={() =>
                        setCurrentTicketIndex((prev) =>
                          prev > 0 ? prev - 1 : concerts.length - 1
                        )
                      }
                      className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-md flex items-center gap-2 relative z-20"
                    >
                      <span>←</span> 上一張
                    </button>
                    <button
                      onClick={() =>
                        setCurrentTicketIndex((prev) =>
                          prev < concerts.length - 1 ? prev + 1 : 0
                        )
                      }
                      className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-md flex items-center gap-2 relative z-20"
                    >
                      下一張 <span>→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === "list" && (
          <div className="pb-12">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  演唱會詳細列表
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜尋..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-16" />
                    <col className="w-28" />
                    <col className="w-32" />
                    <col className="w-40" />
                    <col className="w-20" />
                    <col className="w-32" />
                    <col className="w-24" />
                    <col className="w-20" />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left p-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                        場次
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                        日期
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                        表演者
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                        演唱會
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                        地點
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                        場地
                      </th>
                      <th className="text-right p-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                        票價
                      </th>
                      <th className="text-center p-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                        類型
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConcerts.map((concert, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm whitespace-nowrap">
                          {concert["場次"]}
                        </td>
                        <td className="p-3 text-sm whitespace-nowrap">
                          {concert.displayDate || concert["日期"]}
                        </td>
                        <td className="p-3 text-sm font-medium break-words">
                          {concert["表演者"]}
                        </td>
                        <td
                          className="p-3 text-sm truncate"
                          title={concert["Live Tour"]}
                        >
                          {concert["Live Tour"]}
                        </td>
                        <td className="p-3 text-sm whitespace-nowrap">
                          {concert["地點"]}
                        </td>
                        <td
                          className="p-3 text-sm truncate"
                          title={concert["場地"]}
                        >
                          {concert["場地"]}
                        </td>
                        <td className="p-3 text-sm text-right whitespace-nowrap">
                          NT$ {concert.priceNumeric.toLocaleString()}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${
                              concert["類型"] === "專場"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {concert["類型"] || "未分類"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                顯示 {filteredConcerts.length} / {totalConcerts} 場演唱會
              </p>
            </div>
          </div>
        )}

        {selectedTab === "timeline" && (
          <div className="pb-12">
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-200/50">
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setTimelineSubTab("review")}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    timelineSubTab === "review"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  年度回顧
                </button>
                <button
                  onClick={() => setTimelineSubTab("calendar")}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    timelineSubTab === "calendar"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  月曆檢視
                </button>
              </div>
              {timelineSubTab === "review" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-8">
                      年度回顧
                    </h2>
                    <div className="space-y-4">
                      {[...yearStats].reverse().map((year, idx) => (
                        <div
                          key={idx}
                          className="bg-gradient-to-r from-gray-50 to-white border border-gray-200/50 rounded-xl p-6 hover:shadow-md transition-all"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-6">
                            <h3 className="text-2xl font-light text-gray-900">
                              {year.year}
                            </h3>
                            <div className="flex gap-8">
                              <div className="text-center">
                                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">
                                  場次
                                </p>
                                <p className="text-2xl font-light text-gray-900">
                                  {year.count}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">
                                  花費
                                </p>
                                <p className="text-xl font-light text-gray-900">
                                  NT$ {year.spent.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-6">
                      月度統計
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={monthStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="month"
                          stroke="#6b7280"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis stroke="#6b7280" />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="count"
                          fill="#a8b4c3"
                          name="場次"
                          radius={[8, 8, 0, 0]}
                        />
                        <Bar
                          dataKey="spent"
                          fill="#b5a99c"
                          name="花費 (NT$)"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {timelineSubTab === "calendar" && (
                <div>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-lg font-medium text-gray-900">
                      月曆檢視
                    </h2>
                    <div className="flex gap-3">
                      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                        <button
                          onClick={() => setCalendarView("month")}
                          className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                            calendarView === "month"
                              ? "bg-white shadow-sm"
                              : "text-gray-600"
                          }`}
                        >
                          單月
                        </button>
                        <button
                          onClick={() => setCalendarView("year")}
                          className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                            calendarView === "year"
                              ? "bg-white shadow-sm"
                              : "text-gray-600"
                          }`}
                        >
                          全年
                        </button>
                      </div>
                      <select
                        value={calendarYear}
                        onChange={(e) => setCalendarYear(e.target.value)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                      >
                        {getCalendarYears().map((year) => (
                          <option key={year} value={year}>
                            {year}年
                          </option>
                        ))}
                      </select>
                      {calendarView === "month" && (
                        <select
                          value={calendarMonth}
                          onChange={(e) =>
                            setCalendarMonth(parseInt(e.target.value))
                          }
                          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                        >
                          {monthNames.map((name, idx) => (
                            <option key={idx} value={idx}>
                              {name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  {calendarView === "month" ? (
                    <div className="max-w-4xl mx-auto">
                      <div className="flex justify-center gap-6 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-blue-200 rounded"></div>
                          <span className="text-sm text-gray-600">專場</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-yellow-200 rounded"></div>
                          <span className="text-sm text-gray-600">拼盤</span>
                        </div>
                      </div>
                      <div className="border border-gray-200 rounded-xl p-6">
                        <h3 className="text-center text-2xl font-medium text-gray-900 mb-6">
                          {calendarYear}年 {monthNames[calendarMonth]}
                        </h3>
                        <div className="grid grid-cols-7 gap-2 mb-3">
                          {dayNames.map((dayName, idx) => (
                            <div
                              key={idx}
                              className="text-center text-sm font-medium text-gray-600 py-2"
                            >
                              {dayName}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2 min-h-[400px]">
                          {(() => {
                            const daysInMonth = getDaysInMonth(
                              parseInt(calendarYear),
                              calendarMonth
                            );
                            const firstDay = getFirstDayOfMonth(
                              parseInt(calendarYear),
                              calendarMonth
                            );
                            const days = [];
                            for (let i = 0; i < firstDay; i++) {
                              days.push(
                                <div
                                  key={`empty-${i}`}
                                  className="aspect-square p-2 bg-gray-50 rounded-lg"
                                ></div>
                              );
                            }
                            for (let day = 1; day <= daysInMonth; day++) {
                              const concertsOnDay = getConcertsForDate(
                                calendarYear,
                                calendarMonth,
                                day
                              );
                              days.push(
                                <div
                                  key={day}
                                  className={`aspect-square p-2 rounded-lg border relative group ${
                                    concertsOnDay.length > 0
                                      ? "bg-blue-50 border-blue-200 hover:bg-blue-100 cursor-pointer"
                                      : "bg-white border-gray-200"
                                  }`}
                                >
                                  <div className="flex flex-col h-full">
                                    <div className="text-xs text-gray-600 font-medium mb-1">
                                      {day}
                                    </div>
                                    {concertsOnDay.length > 0 && (
                                      <>
                                        <div className="flex-1 overflow-hidden space-y-1">
                                          {concertsOnDay.map(
                                            (concert, cidx) => (
                                              <div
                                                key={cidx}
                                                className="text-[9px] leading-tight bg-blue-600 text-white font-medium px-1 py-0.5 rounded truncate"
                                              >
                                                {concert["表演者"]}
                                              </div>
                                            )
                                          )}
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 absolute top-full left-0 mt-2 bg-gray-900 text-white px-3 py-2 rounded-lg text-xs shadow-xl z-50 pointer-events-none whitespace-nowrap">
                                          <div className="space-y-1">
                                            {concertsOnDay.map(
                                              (concert, cidx) => (
                                                <div key={cidx}>
                                                  {concert["類型"] === "拼盤"
                                                    ? concert["Live Tour"]
                                                    : `${concert["表演者"]} - ${concert["Live Tour"]}`}
                                                </div>
                                              )
                                            )}
                                          </div>
                                          <div className="absolute bottom-full left-4 transform -translate-x-1/2">
                                            <div className="border-4 border-transparent border-b-gray-900"></div>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                            return days;
                          })()}
                        </div>
                        <div className="flex justify-between items-center mt-6 h-12">
                          <button
                            onClick={() => {
                              if (calendarMonth === 0) {
                                setCalendarMonth(11);
                                const years = getCalendarYears();
                                const currentYearIndex =
                                  years.indexOf(calendarYear);
                                if (currentYearIndex > 0)
                                  setCalendarYear(years[currentYearIndex - 1]);
                              } else {
                                setCalendarMonth(calendarMonth - 1);
                              }
                            }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                          >
                            ← 上個月
                          </button>
                          <button
                            onClick={() => {
                              if (calendarMonth === 11) {
                                setCalendarMonth(0);
                                const years = getCalendarYears();
                                const currentYearIndex =
                                  years.indexOf(calendarYear);
                                if (currentYearIndex < years.length - 1)
                                  setCalendarYear(years[currentYearIndex + 1]);
                              } else {
                                setCalendarMonth(calendarMonth + 1);
                              }
                            }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                          >
                            下個月 →
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="min-w-[900px]">
                      <h3 className="text-center text-2xl font-medium text-gray-900 mb-8">
                        {calendarYear}年
                      </h3>
                      <div className="space-y-6">
                        {[
                          [0, 1, 2],
                          [3, 4, 5],
                          [6, 7, 8],
                          [9, 10, 11],
                        ].map((quarter, qIdx) => (
                          <div key={qIdx} className="grid grid-cols-3 gap-4">
                            {quarter.map((monthIndex) => {
                              const daysInMonth = getDaysInMonth(
                                parseInt(calendarYear),
                                monthIndex
                              );
                              const firstDay = getFirstDayOfMonth(
                                parseInt(calendarYear),
                                monthIndex
                              );
                              const totalCells =
                                Math.ceil((daysInMonth + firstDay) / 7) * 7;
                              const days = [];
                              for (let i = 0; i < firstDay; i++)
                                days.push({ day: null, concerts: [] });
                              for (let day = 1; day <= daysInMonth; day++) {
                                const concertsOnDay = getConcertsForDate(
                                  calendarYear,
                                  monthIndex,
                                  day
                                );
                                days.push({ day, concerts: concertsOnDay });
                              }
                              while (days.length < totalCells)
                                days.push({ day: null, concerts: [] });
                              return (
                                <div
                                  key={monthIndex}
                                  className="border border-gray-200 rounded-lg p-3 bg-white"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-lg font-bold text-gray-900">
                                      {monthIndex + 1}
                                    </span>
                                    <h4 className="text-sm font-semibold text-gray-900 uppercase">
                                      {monthNamesEn[monthIndex]}
                                    </h4>
                                  </div>
                                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                                    {dayNames.map((dayName, idx) => (
                                      <div
                                        key={idx}
                                        className="text-center text-[10px] font-medium text-gray-500 py-0.5"
                                      >
                                        {dayName}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="grid grid-cols-7 gap-0.5">
                                    {days.map((dayData, idx) => {
                                      let bgColor = "";
                                      let textColor = "text-gray-700";
                                      let hoverColor = "hover:bg-gray-50";
                                      if (dayData.concerts.length > 0) {
                                        const hasSolo = dayData.concerts.some(
                                          (c) => c["類型"] === "專場"
                                        );
                                        const hasFestival =
                                          dayData.concerts.some(
                                            (c) => c["類型"] === "拼盤"
                                          );
                                        if (hasSolo && hasFestival) {
                                          bgColor =
                                            "bg-gradient-to-br from-blue-200 to-yellow-200";
                                          textColor = "text-gray-900";
                                          hoverColor = "hover:brightness-95";
                                        } else if (hasSolo) {
                                          bgColor = "bg-blue-200";
                                          textColor = "text-blue-900";
                                          hoverColor = "hover:bg-blue-300";
                                        } else if (hasFestival) {
                                          bgColor = "bg-yellow-200";
                                          textColor = "text-yellow-900";
                                          hoverColor = "hover:bg-yellow-300";
                                        }
                                      }
                                      return (
                                        <div
                                          key={idx}
                                          className={`aspect-square flex items-center justify-center text-[11px] font-medium rounded cursor-pointer relative group ${
                                            dayData.day === null
                                              ? ""
                                              : `${bgColor} ${textColor} ${hoverColor}`
                                          }`}
                                        >
                                          {dayData.day}
                                          {dayData.concerts.length > 0 && (
                                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white px-2 py-1.5 rounded text-[10px] shadow-xl z-50 pointer-events-none whitespace-nowrap">
                                              <div className="space-y-0.5">
                                                {dayData.concerts.map(
                                                  (concert, cidx) => (
                                                    <div key={cidx}>
                                                      {concert["類型"] ===
                                                      "拼盤"
                                                        ? concert["Live Tour"]
                                                        : `${concert["表演者"]} - ${concert["Live Tour"]}`}
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                              <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                                                <div className="border-4 border-transparent border-t-gray-900"></div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mt-8">
                        <button
                          onClick={() => {
                            const years = getCalendarYears();
                            const currentYearIndex =
                              years.indexOf(calendarYear);
                            if (currentYearIndex > 0)
                              setCalendarYear(years[currentYearIndex - 1]);
                          }}
                          disabled={
                            getCalendarYears().indexOf(calendarYear) === 0
                          }
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ← 上一年
                        </button>
                        <button
                          onClick={() => {
                            const years = getCalendarYears();
                            const currentYearIndex =
                              years.indexOf(calendarYear);
                            if (currentYearIndex < years.length - 1)
                              setCalendarYear(years[currentYearIndex + 1]);
                          }}
                          disabled={
                            getCalendarYears().indexOf(calendarYear) ===
                            getCalendarYears().length - 1
                          }
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          下一年 →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === "venues" && (
          <div className="pb-12">
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg border border-gray-200/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => setVenueSubTab("stats")}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      venueSubTab === "stats"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    場館統計
                  </button>
                  <button
                    onClick={() => setVenueSubTab("map")}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      venueSubTab === "map"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    地圖分布
                  </button>
                </div>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year === "all" ? "所有年份" : `${year}年`}
                    </option>
                  ))}
                </select>
              </div>
              {venueSubTab === "stats" && (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-8">
                    場館統計 Top 15
                  </h3>
                  <div className="mb-8 max-w-5xl mx-auto">
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={venueStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          type="number"
                          stroke="#6b7280"
                          style={{ fontSize: "12px" }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={150}
                          stroke="#6b7280"
                          style={{ fontSize: "11px" }}
                          interval={0}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="count"
                          fill="#3b82f6"
                          name="場次"
                          radius={[0, 8, 8, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
                    {venueStats.map((venue, idx) => (
                      <div
                        key={idx}
                        className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center hover:shadow-md transition-all"
                      >
                        <p className="text-2xl font-light text-gray-900">
                          {venue.count}
                        </p>
                        <p
                          className="text-xs font-medium text-gray-600 mt-1 truncate"
                          title={venue.name}
                        >
                          {venue.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {venueSubTab === "map" && (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-8">
                    演唱會地點分布
                  </h3>
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-800 font-light">
                      💡 提示：以下是按城市統計的場館分布。
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {locationStats.map((loc, idx) => (
                      <div
                        key={idx}
                        className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4 text-center hover:shadow-md transition-all"
                      >
                        <p className="text-3xl font-light text-gray-900">
                          {loc.count}
                        </p>
                        <p className="text-sm font-medium text-gray-700 mt-1">
                          {loc.name}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
                    <h4 className="text-md font-medium text-gray-900 mb-4">
                      各城市前五大場館
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {locationStats.map((loc) => {
                        const cityVenues = [];
                        concerts.forEach((c) => {
                          if (
                            c["地點"] === loc.name &&
                            c["場地"] &&
                            c["場地"] !== "null" &&
                            c["場地"] !== "未知"
                          ) {
                            const existingVenue = cityVenues.find(
                              (v) => v.name === c["場地"]
                            );
                            if (existingVenue) {
                              existingVenue.count++;
                            } else {
                              cityVenues.push({ name: c["場地"], count: 1 });
                            }
                          }
                        });
                        cityVenues.sort((a, b) => b.count - a.count);
                        const topVenues = cityVenues.slice(0, 5);
                        if (topVenues.length === 0) return null;
                        return (
                          <div
                            key={loc.name}
                            className="bg-white rounded-xl p-4 border border-gray-200"
                          >
                            <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-orange-600" />
                              {loc.name}
                            </h5>
                            <div className="space-y-2">
                              {topVenues.map((venue, vidx) => (
                                <div
                                  key={vidx}
                                  className="flex justify-between items-center text-sm"
                                >
                                  <span className="text-gray-700 truncate">
                                    {venue.name}
                                  </span>
                                  <span className="text-gray-500 ml-2">
                                    {venue.count}場
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 因為程式碼太長，我會繼續在下一個 update */}
      </div>
    </div>
  );
};

export default ConcertDashboard;
