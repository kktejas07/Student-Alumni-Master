import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'expo-router';

export function ForAlumni() {
  const router = useRouter();

  return (
    <section className="relative px-4 sm:px-6 py-24 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="text-xs font-bold tracking-widest text-[#8B84FF] uppercase mb-4">
            If You Are an Alumnus
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            One hour a month, <span className="text-[#8B84FF]">clearly spent.</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-400 leading-relaxed mb-8 max-w-lg">
            You set your capacity. Nothing is scheduled that you have not agreed to. Every hour is logged against your college's placement record, so your contribution is visible where it counts.
          </p>
          <button
            onClick={() => router.push('/get-started')}
            className="px-6 py-3.5 rounded-xl text-sm font-bold text-white border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
          >
            Become a mentor
          </button>
        </div>

        <div className="space-y-4">
          {[
            {
              num: '01',
              title: 'You choose the load',
              desc: 'One call, one review, or answer questions in writing only.'
            },
            {
              num: '02',
              title: 'Agendas arrive prepared',
              desc: "Each session opens with the student's roadmap and three questions."
            },
            {
              num: '03',
              title: 'Answers compound',
              desc: 'Anything you answer once is archived, so it is never asked again.'
            }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="flex items-start gap-6 p-6 rounded-2xl bg-[#0C0E1B] border border-white/10"
            >
              <div className="text-sm font-bold text-[#8B84FF] pt-0.5">{item.num}</div>
              <div>
                <h4 className="text-base font-bold text-white mb-1">{item.title}</h4>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
