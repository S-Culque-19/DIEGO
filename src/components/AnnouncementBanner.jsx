import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { Bell, Info } from "lucide-react";

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAnnouncements(docs.filter((item) => item.active !== false));
    });
    return unsubscribe;
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-sky-500 via-sky-400 to-sky-500 text-white px-4 py-3 shadow-md shadow-sky-100">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white/20 rounded-xl backdrop-blur-sm">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide flex items-center gap-2">
              <span className="uppercase text-[10px] bg-white text-sky-600 font-bold px-2 py-0.5 rounded-full">
                Aviso Oficial
              </span>
              {announcements[0].title}
            </p>
            <p className="text-xs text-sky-50">{announcements[0].message}</p>
          </div>
        </div>
        <div className="hidden md:flex items-center text-[11px] text-sky-100">
          <Info className="w-3.5 h-3.5 mr-1" /> Solo compras verificadas
        </div>
      </div>
    </div>
  );
}

