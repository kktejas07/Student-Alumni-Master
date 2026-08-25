import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'expo-router';

export function OnTheGround() {
  const router = useRouter();

  return (
    <section className="relative px-4 sm:px-6 py-20 max-w-7xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-[#F4F2FF] to-[#EAF7FA] text-gray-900 p-8 sm:p-12 shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 bottom-0 w-80 h-80 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-[#2E2091]/10 text-[#2E2091]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E2091]" />
              <span>On The Ground</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#141726] mt-4 mb-4 leading-tight">
              The network is a feed until it meets in person.
            </h2>

            <p className="text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed">
              Eighty-six ECHO events across thirty-one campuses. Alumni in the room, recruiters at the table, and a build sprint that runs overnight.
            </p>

            <div className="grid grid-cols-3 gap-6 sm:gap-10 my-8">
              <div>
                <div className="text-2xl sm:text-4xl font-extrabold text-[#4B3FA8]">86</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium mt-1">events run</div>
              </div>
              <div>
                <div className="text-2xl sm:text-4xl font-extrabold text-[#0E6E8C]">31</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium mt-1">cities</div>
              </div>
              <div>
                <div className="text-2xl sm:text-4xl font-extrabold text-[#A21C63]">4.8</div>
                <div className="text-xs sm:text-sm text-gray-500 font-medium mt-1">average rating</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push('/echo')}
                className="px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-[#4B3FD6] hover:bg-[#3E32C4] shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
              >
                See the events
              </button>
              <button
                onClick={() => router.push('/get-started')}
                className="px-6 py-3.5 rounded-xl text-sm font-bold text-[#2E2A55] border border-[#CFC9F3] hover:bg-white/60 transition-all cursor-pointer"
              >
                Host on your campus
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 grid grid-cols-2 gap-3">
            <div className="col-span-2 h-32 rounded-2xl bg-indigo-900/10 border border-indigo-900/15 p-4 flex flex-col justify-end">
              <span className="text-xs font-bold text-indigo-900 uppercase">Keynote Conclave</span>
              <span className="text-sm font-medium text-gray-600">500+ attendees</span>
            </div>
            <div className="h-24 rounded-2xl bg-teal-900/10 border border-teal-900/15 p-3 flex flex-col justify-end">
              <span className="text-xs font-bold text-teal-900 uppercase">Build Sprint</span>
              <span className="text-xs text-gray-600">Overnight</span>
            </div>
            <div className="h-24 rounded-2xl bg-purple-900/10 border border-purple-900/15 p-3 flex flex-col justify-end">
              <span className="text-xs font-bold text-purple-900 uppercase">Workshops</span>
              <span className="text-xs text-gray-600">Hands-on</span>
            </div>
          </div>
        </div>

        {/* Recent Hosts */}
        <div className="mt-8 pt-6 border-t border-black/10 flex items-center gap-4 flex-wrap">
          <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">Recent Hosts:</span>
          {['Sreenidhi Institute', 'VNR VJIET', 'Khammam Institute', 'CBIT Hyderabad'].map((host) => (
            <span
              key={host}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-black/5 text-[#2E2A55]"
            >
              {host}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
