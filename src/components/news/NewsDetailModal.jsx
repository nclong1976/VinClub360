import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Clock,
  Calendar,
  Eye,
  Share2,
  Tag,
  ChevronLeft,
  Bookmark,
  ThumbsUp,
  Sparkles,
  Volume2,
  VolumeX,
  Type,
  Printer,
  Check,
  Building2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

export default function NewsDetailModal({ article, onClose, onSelectArticle, allArticles = [] }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(() => {
    const base = parseInt((article?.views || "3500").replace(/[^0-9]/g, ""), 10) || 1200;
    return Math.floor(base * 0.12) + 48;
  });
  const [saved, setSaved] = useState(false);
  const [fontSize, setFontSize] = useState("md"); // 'sm' | 'md' | 'lg'
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);
  const speechRef = useRef(null);

  useEffect(() => {
    // Reset audio when article changes
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [article?.id]);

  if (!article) return null;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.excerpt,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Đã sao chép liên kết bài báo vào bộ nhớ tạm!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleAudioSpeech = () => {
    if (!('speechSynthesis' in window)) {
      toast.error("Trình duyệt không hỗ trợ đọc văn bản tự động");
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      toast.info("Đã tạm dừng giọng đọc AI");
      return;
    }

    window.speechSynthesis.cancel();
    const fullTextToRead = `${article.title}. ${article.excerpt}. ` + 
      (article.sections || [])
        .map(s => s.text || s.title || (s.items ? s.items.join('. ') : ''))
        .join('. ');

    const utterance = new SpeechSynthesisUtterance(fullTextToRead);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsPlayingAudio(false);
    };
    utterance.onerror = () => {
      setIsPlayingAudio(false);
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
    toast.success("Đang phát bản tin qua phát thanh viên AI...");
  };

  const toggleLike = () => {
    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    toast.success(liked ? "Đã bỏ thích bài viết" : "Cảm ơn bạn đã quan tâm bản tin này!");
  };

  const toggleSave = () => {
    setSaved(!saved);
    toast.success(saved ? "Đã bỏ lưu bài báo" : "Đã lưu bài báo vào mục yêu thích!");
  };

  const handlePrint = () => {
    window.print();
  };

  // Font size map
  const bodyTextClass = {
    sm: "text-[12px] leading-relaxed",
    md: "text-[13.5px] leading-relaxed",
    lg: "text-[15.5px] leading-relaxed",
  }[fontSize];

  const relatedList = allArticles
    .filter((a) => a.id !== article.id && (a.category === article.category || !article.category))
    .slice(0, 3);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md font-heading"
      >
        <motion.div
          initial={{ scale: 0.94, y: 25, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, y: 25, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[540px] bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[94vh] flex flex-col border border-amber-900/15"
        >
          {/* Top Editorial Masthead Bar */}
          <div className="bg-[#1a1714] text-amber-50/90 px-4 py-3 flex items-center justify-between border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition cursor-pointer"
                title="Quay lại"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#d4af37]" />
                <span className="text-[11px] font-bold text-[#eddab3] uppercase tracking-wider">
                  Bản Tin Tập Đoàn
                </span>
              </div>
            </div>

            {/* Top action icons */}
            <div className="flex items-center gap-1.5">
              {/* Audio reading toggle */}
              <button
                onClick={toggleAudioSpeech}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                  isPlayingAudio
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-white/10 text-amber-100 hover:bg-white/20"
                }`}
                title="Nghe đọc bản tin AI"
              >
                {isPlayingAudio ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Dừng</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>Nghe đọc</span>
                  </>
                )}
              </button>

              {/* Font size switcher */}
              <div className="flex items-center bg-white/10 rounded-full p-0.5">
                <button
                  onClick={() => setFontSize(fontSize === "sm" ? "md" : fontSize === "md" ? "lg" : "sm")}
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-[#eddab3] hover:text-white flex items-center gap-0.5 cursor-pointer"
                  title="Thay đổi cỡ chữ"
                >
                  <Type className="w-3 h-3" />
                  <span className="uppercase text-[9px]">{fontSize}</span>
                </button>
              </div>

              {/* Save */}
              <button
                onClick={toggleSave}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                  saved ? "bg-amber-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                }`}
                title="Lưu bài báo"
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Article Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 text-gray-800">
            {/* Category & Badge Row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#948154] text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
                  {article.category || "Tin tức"}
                </span>
                {article.featured && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-bold uppercase flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Tiêu điểm
                  </span>
                )}
              </div>
              <span className="text-[10.5px] text-gray-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#948154]" />
                {article.readingTime || "3 phút đọc"}
              </span>
            </div>

            {/* Headline Title */}
            <h1 className="text-[18px] sm:text-[21px] font-extrabold text-gray-900 leading-snug tracking-tight">
              {article.title}
            </h1>

            {/* Byline & Metadata Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 border-y border-gray-100 text-[11px] text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#948154] to-[#cbb279] text-white flex items-center justify-center font-bold text-[10px]">
                  VIN
                </div>
                <div>
                  <p className="font-bold text-gray-900 leading-tight">{article.author || "Ban Biên Tập VinClub"}</p>
                  <p className="text-[10px] text-gray-400">Tòa soạn Truyền thông & Phân tích Thị trường</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10.5px] text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#948154]" />
                  {article.date || "12/09/2026"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {article.views || "4,200"} lượt xem
                </span>
              </div>
            </div>

            {/* Lead Sapo paragraph */}
            {article.excerpt && (
              <div className="p-4 rounded-2xl bg-[#faf7f2] border-l-4 border-[#948154] space-y-1">
                <p className="text-[13.5px] sm:text-[14px] font-semibold text-[#3d3321] leading-relaxed italic">
                  "{article.excerpt}"
                </p>
              </div>
            )}

            {/* Hero Photo with Caption */}
            {article.image && (
              <div className="space-y-1.5 rounded-2xl overflow-hidden shadow-xs border border-gray-100">
                <div className="relative w-full h-[220px] sm:h-[260px] overflow-hidden bg-gray-100">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-[10px] text-gray-500 italic text-center px-3 py-1 font-medium bg-gray-50">
                  Ảnh: Hệ sinh thái hạ tầng du lịch & bất động sản phát triển bởi Tập đoàn Vingroup
                </p>
              </div>
            )}

            {/* Main Content Sections */}
            <div className={`space-y-4 text-gray-700 ${bodyTextClass}`}>
              {article.sections && article.sections.length > 0 ? (
                article.sections.map((sec, idx) => {
                  if (sec.type === "paragraph") {
                    return (
                      <p key={idx} className="text-gray-800 leading-relaxed text-justify">
                        {sec.text}
                      </p>
                    );
                  }
                  if (sec.type === "highlight") {
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 space-y-2.5 shadow-xs my-3"
                      >
                        <h4 className="text-[13px] font-bold text-amber-950 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#948154]" />
                          {sec.title}
                        </h4>
                        <ul className="space-y-2 text-[12px] text-amber-900">
                          {sec.items?.map((item, itemIdx) => (
                            <li key={itemIdx} className="flex items-start gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#948154] mt-1.5 shrink-0" />
                              <span className="leading-snug">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                  if (sec.type === "image") {
                    return (
                      <div key={idx} className="space-y-1.5 my-3">
                        <div className="rounded-2xl overflow-hidden shadow-xs border border-gray-100 bg-gray-100">
                          <img
                            src={sec.url}
                            alt={sec.caption || "Hình ảnh minh họa"}
                            className="w-full h-auto max-h-[250px] object-cover"
                          />
                        </div>
                        {sec.caption && (
                          <p className="text-[10.5px] text-gray-500 italic text-center font-medium bg-gray-50/80 py-1 px-3 rounded-lg">
                            {sec.caption}
                          </p>
                        )}
                      </div>
                    );
                  }
                  if (sec.type === "quote") {
                    return (
                      <blockquote
                        key={idx}
                        className="p-4 rounded-2xl bg-[#f9f8f5] border-l-4 border-[#948154] text-gray-800 space-y-1.5 my-3 shadow-xs"
                      >
                        <p className="italic font-medium text-[13px] leading-relaxed text-[#41392b]">
                          "{sec.text}"
                        </p>
                        {sec.author && (
                          <p className="text-[11px] font-bold text-[#948154] text-right not-italic">
                            — {sec.author}
                          </p>
                        )}
                      </blockquote>
                    );
                  }
                  return null;
                })
              ) : (
                <p className="text-gray-800 leading-relaxed text-justify">
                  {article.excerpt}
                </p>
              )}
            </div>

            {/* Tags section */}
            {article.tags && article.tags.length > 0 && (
              <div className="pt-3 border-t border-gray-100 space-y-1.5">
                <p className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3 h-3 text-[#948154]" /> Từ khóa bài báo:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {article.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-[10.5px] font-medium text-gray-700 transition"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Corporate Disclaimer */}
            <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 text-[10px] text-gray-500 space-y-1 leading-relaxed">
              <p className="font-bold text-gray-700">© Bản quyền phát hành thuộc về Tập đoàn VinClub</p>
              <p>
                Bản tin được tổng hợp và chứng thực từ các nguồn dữ liệu tài chính chính thống. Mọi thông tin đầu tư đều được bảo đảm theo khung thỏa thuận hợp tác và quy chế quản lý tài sản số của tập đoàn.
              </p>
            </div>

            {/* Article Engagement Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
              <button
                onClick={toggleLike}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                  liked
                    ? "bg-[#948154] text-white shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{likeCount} Hữu ích</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-gray-700 border border-gray-200 text-[11px] font-bold hover:bg-gray-100 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-[#948154]" />}
                  <span>{copied ? "Đã chép link" : "Chia sẻ"}</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="p-1.5 rounded-xl bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 cursor-pointer"
                  title="In bài báo"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Related Articles Carousel / List */}
            {relatedList.length > 0 && (
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[12.5px] font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
                    <div className="w-1.5 h-3.5 bg-[#948154] rounded-full" />
                    Tin tức liên quan cùng chuyên mục
                  </h4>
                </div>
                <div className="space-y-2">
                  {relatedList.map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => {
                        if (onSelectArticle) {
                          onSelectArticle(rel);
                        }
                      }}
                      className="p-2.5 rounded-xl bg-gray-50 hover:bg-amber-50/80 border border-gray-100 transition cursor-pointer flex gap-3 group"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-200">
                        <img src={rel.image} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <h5 className="text-[11.5px] font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-[#948154] transition">
                          {rel.title}
                        </h5>
                        <div className="flex items-center justify-between text-[9.5px] text-gray-400 mt-1">
                          <span>{rel.time}</span>
                          <span className="text-[#948154] font-bold flex items-center gap-0.5">
                            Xem <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Bottom Action */}
          <div className="p-3 bg-white border-t border-gray-100 shrink-0 flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-[12px] hover:bg-gray-50 transition cursor-pointer text-center"
            >
              Đóng bài báo
            </button>
            <button
              onClick={() => {
                onClose();
                window.location.href = "/resort";
              }}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#948154] to-[#73623a] text-white font-bold text-[12px] shadow hover:brightness-110 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Xem gói đầu tư</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
