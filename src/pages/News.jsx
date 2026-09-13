import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock,
  TrendingUp,
  Search,
  ArrowRight,
  Flame,
  Building2,
  Calendar,
  Eye,
  Radio,
  Tag,
  SlidersHorizontal,
  ChevronRight,
  Mail,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import BottomNav from "@/components/BottomNav";
import { NEWS_CATEGORIES, MARKET_INDICES, sortNewsList } from "@/constants/newsData";
import NewsDetailModal from "@/components/news/NewsDetailModal";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function News() {
  const [newsData, setNewsData] = useState([]);
  const [activeCat, setActiveCat] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [viewMode, setViewMode] = useState("latest"); // 'latest' | 'trending' | 'featured'
  const [emailSubscribe, setEmailSubscribe] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Tải danh sách tin tức
  useEffect(() => {
    base44.entities.News.list("-created_date", 200)
      .then((items) => setNewsData(sortNewsList(items)))
      .catch(() => {});

    const unsubscribe = base44.entities.News.subscribe((items) => {
      if (Array.isArray(items)) setNewsData(sortNewsList(items));
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Auto-open article if URL has ?id=...
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const articleId = params.get("id");
    if (articleId) {
      const found = newsData.find((item) => item.id === articleId);
      if (found) {
        setSelectedArticle(found);
      }
    }
  }, [location.search, newsData]);

  // Current Date formatted in Vietnamese corporate style
  const todayFormatted = useMemo(() => {
    const now = new Date();
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dayName = days[now.getDay()];
    const dateStr = now.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    return `${dayName}, ${dateStr} • Giờ Hà Nội (GMT+7)`;
  }, []);

  // Filtered & Sorted news
  const filtered = useMemo(() => {
    let list = [...newsData];

    // Filter by Category
    if (activeCat !== "Tất cả") {
      list = list.filter((n) => n.category === activeCat);
    }

    // Filter by Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.excerpt?.toLowerCase().includes(q) ||
          (n.tags && n.tags.some((t) => t.toLowerCase().includes(q))) ||
          n.author?.toLowerCase().includes(q)
      );
    }

    // Sort by View Mode
    if (viewMode === "trending") {
      list.sort((a, b) => {
        const vA = parseInt((a.views || "0").replace(/[^0-9]/g, ""), 10) || 0;
        const vB = parseInt((b.views || "0").replace(/[^0-9]/g, ""), 10) || 0;
        return vB - vA;
      });
    } else if (viewMode === "featured") {
      list = list.filter((n) => n.featured || n.breaking);
    }

    return list;
  }, [newsData, activeCat, searchQuery, viewMode]);

  // Lead Front-Page Story (Tiêu điểm Trang Nhất)
  const leadStory = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.find((n) => n.featured) || filtered[0];
  }, [filtered]);

  // Secondary Top Stories
  const topStories = useMemo(() => {
    if (!leadStory) return [];
    return filtered.filter((n) => n.id !== leadStory.id).slice(0, 3);
  }, [filtered, leadStory]);

  // Feed Stories
  const streamStories = useMemo(() => {
    if (!leadStory) return [];
    const topIds = new Set([leadStory.id, ...topStories.map((t) => t.id)]);
    return filtered.filter((n) => !topIds.has(n.id));
  }, [filtered, leadStory, topStories]);

  // Breaking flash news headlines
  const breakingHeadlines = useMemo(() => {
    return newsData.slice(0, 4);
  }, [newsData]);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!emailSubscribe || !emailSubscribe.includes("@")) {
      toast.error("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }
    setSubscribed(true);
    toast.success("Đã đăng ký nhận bản tin Tập đoàn mỗi sáng thành công!");
  };

  const POPULAR_TAGS = ["Vinpearl", "Vinhomes", "Cổ phiếu VIC", "Lợi nhuận theo giờ", "Quỹ Thiện Tâm", "Nghỉ dưỡng 5 sao"];

  return (
    <main className="relative w-full min-h-screen bg-[#f8f7f4] overflow-x-hidden font-heading pb-24 text-gray-900">
      <PageHeader title="Thời Sự & Tin Tức Thị Trường" />

      {/* ── NEWSPAPER MASTHEAD ── */}
      <div className="bg-[#14120f] text-white border-b border-[#2d2822]">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#948154] to-[#e4c988] flex items-center justify-center shadow-md">
                <Building2 className="w-4 h-4 text-[#14120f]" />
              </div>
              <div>
                <h1 className="text-[13px] sm:text-[15px] font-extrabold tracking-wider uppercase text-[#eddab3]">
                  Tòa Soạn Báo Điện Tử VinClub
                </h1>
                <p className="text-[9.5px] text-gray-400 font-medium tracking-wide">
                  Cổng Thông Tin Tài Chính, Bất Động Sản & Thị Trường Vingroup
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-gray-300">
              <Calendar className="w-3 h-3 text-[#d4af37]" />
              <span>{todayFormatted}</span>
            </div>
          </div>

          {/* Live Market Ticker */}
          <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-hide text-[10px]" style={{ scrollbarWidth: "none" }}>
            <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 font-bold uppercase tracking-wider">
              <Radio className="w-2.5 h-2.5 text-rose-400 animate-pulse" />
              <span>Thị trường:</span>
            </div>
            {MARKET_INDICES.map((idx, i) => (
              <div
                key={i}
                className="shrink-0 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 flex items-center gap-2 text-gray-200"
              >
                <span className="font-bold text-[#eddab3]">{idx.code}</span>
                <span className="font-semibold text-white">{idx.val}</span>
                <span className="text-emerald-400 font-bold flex items-center">
                  <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                  {idx.percent}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BREAKING NEWS FLASH BAR ── */}
      {breakingHeadlines.length > 0 && (
        <div className="bg-[#948154] text-white py-1.5 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 flex items-center gap-2 text-[11px] overflow-hidden">
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-black/30 font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-300 fill-amber-300" />
              TIN NÓNG
            </span>
            <div className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-6 text-[11px] font-medium" style={{ scrollbarWidth: "none" }}>
              {breakingHeadlines.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedArticle(b)}
                  className="hover:underline flex items-center gap-1.5 shrink-0 text-white/95 cursor-pointer text-left"
                >
                  <span className="text-amber-200">•</span>
                  <span>{b.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="max-w-4xl mx-auto px-3.5 sm:px-4 py-4 space-y-5">
        {/* Search & Keywords */}
        <div className="bg-white rounded-2xl p-3 shadow-xs border border-gray-200/80 space-y-2.5">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài báo, dự án Vinpearl, mã VIC, VHM..."
              className="w-full pl-10 pr-8 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[12px] focus:outline-none focus:border-[#948154] focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black text-[11px]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Hot Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide text-[10px]" style={{ scrollbarWidth: "none" }}>
            <span className="text-gray-400 font-bold shrink-0 flex items-center gap-0.5">
              <Tag className="w-2.5 h-2.5 text-[#948154]" /> Chủ đề hot:
            </span>
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className="shrink-0 px-2 py-0.5 rounded-full bg-gray-100 hover:bg-[#948154]/10 hover:text-[#948154] text-gray-600 transition cursor-pointer"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Categories & View Mode Switcher */}
        <div className="space-y-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            {NEWS_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  activeCat === cat
                    ? "bg-[#948154] text-white shadow-xs"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-[#948154]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Secondary Sorting Tabs */}
          <div className="flex items-center justify-between text-[11px] pt-1">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200">
              <button
                onClick={() => setViewMode("latest")}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  viewMode === "latest" ? "bg-[#14120f] text-[#eddab3]" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Mới nhất
              </button>
              <button
                onClick={() => setViewMode("trending")}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  viewMode === "trending" ? "bg-[#14120f] text-[#eddab3]" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Đọc nhiều
              </button>
              <button
                onClick={() => setViewMode("featured")}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  viewMode === "featured" ? "bg-[#14120f] text-[#eddab3]" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Tiêu điểm
              </button>
            </div>

            <span className="text-[10.5px] text-gray-400 font-medium">
              Hiển thị <span className="font-bold text-gray-800">{filtered.length}</span> bài báo
            </span>
          </div>
        </div>

        {/* ── EDITORIAL FRONT-PAGE GRID ── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-200 shadow-xs space-y-3">
            <SlidersHorizontal className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-[14px] font-bold text-gray-700">Không tìm thấy bài báo nào</p>
            <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
              Thử xóa từ khóa tìm kiếm hoặc chọn chuyên mục khác để xem tin tức.
            </p>
            <button
              onClick={() => {
                setActiveCat("Tất cả");
                setSearchQuery("");
                setViewMode("latest");
              }}
              className="px-4 py-2 rounded-xl bg-[#948154] text-white text-[11px] font-bold cursor-pointer hover:bg-[#837046] transition"
            >
              Xem tất cả bài viết
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Grid: Lead Story + Top 3 Trending Stories */}
            {leadStory && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                {/* Lead Headline Story (Span 7) */}
                <motion.article
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedArticle(leadStory)}
                  className="md:col-span-7 bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-200/90 hover:border-[#948154] transition cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="relative w-full h-[210px] sm:h-[240px] overflow-hidden bg-gray-900">
                      <img
                        src={leadStory.image}
                        alt={leadStory.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                      
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> TIÊU ĐIỂM TRANG NHẤT
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#eddab3] text-[9px] font-bold">
                          {leadStory.category}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h2 className="text-[16px] sm:text-[18px] font-extrabold leading-snug drop-shadow-md group-hover:text-[#eddab3] transition">
                          {leadStory.title}
                        </h2>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <p className="text-[12px] text-gray-600 leading-relaxed line-clamp-3">
                        {leadStory.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-1 flex items-center justify-between border-t border-gray-100 text-[10.5px] text-gray-400">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{leadStory.author || "VinClub"}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#948154]" />
                        {leadStory.time}
                      </span>
                    </div>
                    <span className="text-[#948154] font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      Đọc trọn vẹn <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </motion.article>

                {/* Top Stories Column (Span 5) */}
                <div className="md:col-span-5 flex flex-col justify-between gap-2.5">
                  <div className="bg-[#1a1714] text-[#eddab3] px-3.5 py-2 rounded-2xl flex items-center justify-between">
                    <span className="text-[11.5px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      Tin Đọc Nhiều Nhất
                    </span>
                    <span className="text-[9.5px] text-gray-400">Cập nhật 24/7</span>
                  </div>

                  {topStories.map((story, idx) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => setSelectedArticle(story)}
                      className="bg-white rounded-2xl p-3 shadow-xs border border-gray-200 hover:border-[#948154] transition cursor-pointer group flex gap-3 items-start"
                    >
                      <div className="w-7 h-7 rounded-xl bg-amber-50 text-[#948154] border border-amber-200 font-extrabold text-[12px] flex items-center justify-center shrink-0">
                        0{idx + 1}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="inline-block px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 text-[8.5px] font-bold">
                          {story.category}
                        </span>
                        <h3 className="text-[12px] font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#948154] transition">
                          {story.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[9.5px] text-gray-400 pt-0.5">
                          <span>{story.time}</span>
                          <span>•</span>
                          <span>{story.views || "3.2k"} lượt xem</span>
                        </div>
                      </div>

                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                        <img
                          src={story.image}
                          alt={story.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SECTION DIVIDER ── */}
            <div className="flex items-center justify-between pt-2 pb-1 border-b-2 border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-4 bg-[#948154] rounded-sm" />
                <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-gray-800">
                  Dòng Thời Sự & Phân Tích Chuyên Sâu ({streamStories.length})
                </h3>
              </div>
            </div>

            {/* ── EDITORIAL STREAM LIST ── */}
            <div className="space-y-3">
              {streamStories.map((item, idx) => (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => setSelectedArticle(item)}
                  className="bg-white rounded-2xl p-3.5 shadow-xs border border-gray-200/80 hover:border-[#948154] transition cursor-pointer group flex flex-col sm:flex-row gap-3.5"
                >
                  <div className="relative w-full sm:w-[170px] h-[120px] rounded-xl overflow-hidden shrink-0 bg-gray-100">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[#eddab3] text-[8.5px] font-bold backdrop-blur-xs">
                      {item.category}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
                    <div className="space-y-1">
                      <h4 className="text-[13.5px] font-bold text-gray-900 leading-snug group-hover:text-[#948154] transition line-clamp-2">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
                        {item.excerpt}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-gray-400 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">{item.author || "VinClub"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-[#948154]" />
                          {item.time}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" />
                          {item.views || "1.5k"}
                        </span>
                      </div>

                      <span className="text-[#948154] font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        Đọc tiếp <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>

            {/* ── NEWSLETTER SUBSCRIPTION BOX ── */}
            <div className="rounded-3xl bg-gradient-to-br from-[#1c1813] to-[#2c241a] text-white p-5 sm:p-6 shadow-md border border-[#948154]/30 space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#d4af37]" />
                <h4 className="text-[14px] font-extrabold uppercase tracking-wide text-[#eddab3]">
                  Nhận Bản Tin Tài Chính & Bất Động Sản Mỗi Sáng
                </h4>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed max-w-xl">
                Đăng ký để nhận thông báo thời gian thực về các chính sách cổ tức mới nhất, phân tích kỹ thuật cổ phiếu VIC/VHM và cơ hội đầu tư nghỉ dưỡng Vinpearl độc quyền.
              </p>

              {subscribed ? (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center gap-2 text-emerald-300 text-[11.5px] font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Cảm ơn bạn! Bạn sẽ nhận bản tin tổng hợp vào 07:30 mỗi sáng.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="email"
                    value={emailSubscribe}
                    onChange={(e) => setEmailSubscribe(e.target.value)}
                    placeholder="Nhập email của bạn (ví dụ: invest@vinclub.vn)..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 text-[12px] focus:outline-none focus:border-[#d4af37]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#948154] text-[#14120f] font-extrabold text-[12px] hover:brightness-110 transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Đăng Ký Ngay</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── ARTICLE MODAL READER ── */}
      {selectedArticle && (
        <NewsDetailModal
          article={selectedArticle}
          allArticles={newsData}
          onClose={() => {
            setSelectedArticle(null);
            // Clear URL query param if any
            navigate("/news", { replace: true });
          }}
          onSelectArticle={(art) => setSelectedArticle(art)}
        />
      )}

      <BottomNav />
    </main>
  );
}
