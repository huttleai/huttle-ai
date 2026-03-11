/* eslint-disable no-unused-vars */

import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Marquee } from "../magicui/Marquee";
import { OrbitingCircles, SocialIcons } from "../OrbitingCircles";
import { Plus, Minus } from 'lucide-react';

export const SocialProofBar = () => {
  const items = [
    { name: "Optimized Posting", subtitle: "AI-Powered Timing" },
    { name: "Content Vault", subtitle: "Organized Assets" },
    { name: "AI Plan Builder", subtitle: "Content Strategy" },
    { name: "Hashtag Generator", subtitle: "Trending Tags" },
    { name: "Content Remix Studio", subtitle: "5 Platform Variations" },
    { name: "AI Power Tools", subtitle: "Advanced Features" },
    { name: "Trend Lab", subtitle: "Real-Time Insights" },
    { name: "Daily Social Updates", subtitle: "Fresh Content Ideas" },
    { name: "Trend Discovery", subtitle: "Viral Opportunities" },
    { name: "Content Library", subtitle: "Organized Assets" },
    { name: "Viral Blueprint", subtitle: "Complete Scripts" },
  ];

  return (
    <div className="py-6 md:py-12 bg-[#0a0f14] border-y border-white/5 overflow-hidden">
      <Marquee duration={40} pauseOnHover gap={32}>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-6 opacity-70 hover:opacity-100 transition-opacity">
            <div className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#01BAD2] to-[#0284c7] whitespace-nowrap">
              {item.name}
            </div>
            <div className="text-[10px] md:text-xs text-slate-500 font-bold whitespace-nowrap uppercase tracking-widest">
              {item.subtitle}
            </div>
          </div>
        ))}
      </Marquee>
    </div>
  );
};

export const PainPointsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const painPoints = [
    { emoji: "🤔", title: "What should we post?", text: "It's 9am. We've been staring at a blank caption for 20 minutes. We post something generic. It gets 12 likes. We wonder why we bother." },
    { emoji: "📉", title: "Why did that flop?", text: "We spent 3 hours on a Reel. Picked the music. Edited the cuts. Wrote the caption. 47 views. Meanwhile, someone filming their lunch gets 200K." },
    { emoji: "😫", title: "We can't keep up", text: "TikTok wants raw. Instagram wants polished. X wants hot takes. YouTube wants long-form. We are one team trying to be four different creators." }
  ];

  return (
    <section className="bg-slate-50 py-24 px-6 md:px-8 lg:px-12 relative overflow-hidden">
      {/* Subtle grid background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div 
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#01BAD2] mb-4 border border-[#01BAD2]/20 px-4 py-1.5 rounded-full inline-block bg-[#01BAD2]/10">
            The Struggle
          </h2>
          <h3 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 mb-6">
            The content grind is real.
          </h3>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg md:text-xl font-medium">
            We built this because we were tired of the constant pressure to create for every platform.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {painPoints.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <div className="group bg-white p-10 rounded-[2rem] border border-slate-200 shadow-xl shadow-zinc-900/5 hover:border-[#01BAD2]/30 transition-all duration-500 h-full flex flex-col hover:-translate-y-2">
                <div className="text-4xl mb-8 bg-slate-50 w-20 h-20 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:scale-110 group-hover:bg-[#01BAD2]/10 transition-all duration-500">
                  {item.emoji}
                </div>
                <h4 className="text-2xl font-bold mb-4 text-zinc-900 group-hover:text-[#01BAD2] transition-colors">
                  {item.title}
                </h4>
                <p className="text-slate-500 leading-relaxed text-base flex-1 font-medium">
                  {item.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const OrbitingPlatformsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div className="relative min-h-[600px] md:min-h-[800px] w-full overflow-hidden bg-white flex flex-col items-center justify-center py-24 md:py-32 px-6 md:px-8 lg:px-12 border-t border-slate-200">
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,1) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      <motion.div 
        ref={ref}
        className="text-center relative z-20 max-w-4xl mx-auto mb-16 px-4"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-zinc-900 mb-6 tracking-tight leading-tight">
          Create for every platform.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#01BAD2] to-[#0284c7]">
            All in one place.
          </span>
        </h2>
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
          TikTok. Instagram. YouTube. X. Facebook. We use one tool that creates content optimized for every algorithm.
        </p>
      </motion.div>

      <div className="relative flex h-[300px] md:h-[500px] w-full items-center justify-center">
        {/* Desktop orbits */}
        <div className="absolute inset-0">
          <div className="relative w-full h-full flex items-center justify-center">
            <OrbitingCircles iconSize={56} radius={180} duration={35} showOrbit={true}>
              <SocialIcons.facebook />
              <SocialIcons.instagram />
              <SocialIcons.tiktok />
              <SocialIcons.youtube />
              <SocialIcons.x />
            </OrbitingCircles>
            <OrbitingCircles iconSize={48} radius={120} reverse duration={25} showOrbit={true}>
              <SocialIcons.tiktok />
              <SocialIcons.instagram />
              <SocialIcons.youtube />
            </OrbitingCircles>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FAQSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "What do Founding Members get?",
      answer: "Full Pro access at $199/yr locked forever. All our AI tools, all features — Viral Blueprint Generator, AI Plan Builder, Content Remix Studio, Content Vault, Trend Lab, AI Power Tools, and more. Cancel anytime with no questions asked."
    },
    {
      question: "What happens when the Founding Member offer ends?",
      answer: "On March 1, the price becomes $249/yr (Builders Club) for 10 days. After March 10, regular Pro pricing is $357/yr. Your founding rate stays locked forever — it never increases, no matter what."
    },
    {
      question: "Can we cancel anytime?",
      answer: "Absolutely. Cancel from your account settings whenever you want. No hoops to jump through, no hidden fees, no awkward phone calls. Your access continues until the end of your billing period."
    },
    {
      question: "Is there a money-back guarantee?",
      answer: "Yes. Founders Club and Builders Club include a 14-day money-back guarantee. If Huttle AI is not right for you, email hello@huttleai.com within 14 days for a full refund."
    },
    {
      question: "What platforms does Huttle AI support?",
      answer: "TikTok, Instagram, YouTube, X (Twitter), and Facebook. All our AI tools generate platform-optimized content — from scripts and captions to hashtags and posting times — tailored to each platform's algorithm."
    },
    {
      question: "Is our payment secure?",
      answer: "100%. All payments are processed through Stripe, the same infrastructure trusted by Amazon, Google, and Shopify. We never store your card information on our servers."
    },
  ];

  return (
    <section className="py-24 md:py-32 px-6 md:px-8 lg:px-12 bg-white border-t border-slate-200">
      <div className="container mx-auto max-w-3xl">
        <motion.div 
          ref={ref}
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#01BAD2]/10 text-[#01BAD2] text-xs font-bold uppercase tracking-widest mb-4 border border-[#01BAD2]/20">
            FAQ
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-zinc-900 tracking-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg md:text-xl text-slate-500 mx-auto font-medium">
            Everything we need to know about Huttle AI
          </p>
        </motion.div>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`border rounded-2xl transition-all duration-300 ${isOpen ? 'border-[#01BAD2]/20 bg-[#01BAD2]/5' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="text-lg font-bold text-zinc-900">{faq.question}</span>
                  <div className={`flex-shrink-0 ml-4 h-8 w-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-[#01BAD2]/10 text-[#01BAD2]' : 'bg-slate-100 text-slate-500'}`}>
                    {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="p-6 pt-0 text-base text-slate-600 font-medium leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
