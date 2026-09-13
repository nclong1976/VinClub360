import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Newspaper, TrendingUp } from "lucide-react";
import NewsDetailModal from "@/components/news/NewsDetailModal";
import { base44 } from "@/api/base44Client";
import { sortNewsList } from "@/constants/newsData";

export default function NewsSection() {
  const [newsData, setNewsData] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);

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

  const featured = newsData.find((n) => n.featured) || newsData[0];
  const sideArticles = newsData.filter((n) => n.id !== featured?.id).slice(0, 3);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 22 }}
      className="px-3.5 mt-6 space-y-3"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#1a1714] text-[#d4af37] flex items-center justify-center">
            <Newspaper className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-[13px] font-extrabold text-[#3a352e] uppercase tracking-wide">
              Bản Tin Thị Trường & Tập Đoàn
            </h2>
            <p className="text-[9px] text-gray-400">Thời sự kinh tế, BĐS & Cổ tức thời gian thực</p>
          </div>
        </div>
        <Link
          to="/news"
          className="flex items-center gap-1 text-[11px] text-[#948154] font-bold hover:underline"
        >
          Xem tòa soạn <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Featured Lead Card (Trang nhất) */}
      {featured && (
        <motion.div
          whileTap={{ scale: 0.99 }}
          onClick={() => setSelectedArticle(featured)}
          className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200/90 hover:border-[#948154] transition cursor-pointer group"
        >
          <div className="relative w-full h-[155px] overflow-hidden bg-gray-900">
            <img
              src={featured.image}
              alt={featured.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
                <TrendingUp className="w-2.5 h-2.5" /> TIÊU ĐIỂM
              </span>
              <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[#eddab3] text-[8px] font-bold">
                {featured.category}
              </span>
            </div>

            <div className="absolute bottom-2.5 left-3 right-3 text-white">
              <h3 className="text-[13px] font-bold leading-snug drop-shadow group-hover:text-[#eddab3] transition line-clamp-2">
                {featured.title}
              </h3>
            </div>
          </div>

          <div className="p-3 space-y-2">
            <p className="text-[10.5px] text-gray-600 leading-relaxed line-clamp-2">
              {featured.excerpt}
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[9.5px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-700">{featured.author || "VinClub"}</span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5 text-[#948154]" />
                  {featured.time}
                </span>
              </div>
              <span className="text-[#948154] font-bold flex items-center gap-0.5">
                Đọc bài báo <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Side Quick News List */}
      <div className="space-y-2">
        {sideArticles.map((n) => (
          <motion.div
            key={n.id || n.title}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedArticle(n)}
            className="bg-white rounded-xl p-2.5 shadow-xs border border-gray-200/80 hover:border-[#948154] transition cursor-pointer flex gap-2.5 items-center group"
          >
            <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
              <img
                src={n.image}
                alt={n.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                loading="lazy"
              />
              <span className="absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded bg-black/70 text-[#eddab3] text-[7px] font-bold">
                {n.category}
              </span>
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="text-[11.5px] font-bold text-gray-800 leading-snug line-clamp-2 group-hover:text-[#948154] transition">
                {n.title}
              </h4>
              <div className="flex items-center justify-between text-[9px] text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-2 h-2 text-[#948154]" />
                  {n.time}
                </span>
                <span className="text-[#948154] font-semibold">Xem chi tiết</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedArticle && (
        <NewsDetailModal
          article={selectedArticle}
          allArticles={newsData}
          onClose={() => setSelectedArticle(null)}
          onSelectArticle={(art) => setSelectedArticle(art)}
        />
      )}
    </motion.section>
  );
}
