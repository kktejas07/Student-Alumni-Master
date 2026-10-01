import React, { useEffect, useRef } from "react";
import { useTheme } from "@/src/theme/ThemeContext";
import { createPortal } from "react-dom";
import { useRouter } from "expo-router";
import { Navbar } from "@/src/views/web/nexus-glow-landing/Navbar";
import CommonFooter from "@/src/views/components/CommonFooter";
import "./echo_styles.css";

const ECHO_SPEC_HTML = "<div id=\"ev-curtain\" style=\"font-family: 'Outfit', -apple-system, sans-serif; position: fixed; inset: 0; z-index: 400; background: #07070E; display: flex; flex-direction: column; justify-content: flex-end; padding: 0 44px 40px; pointer-events: none; opacity: 1; transition: opacity .45s ease;\">\n    <div style=\"position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 32px;\">\n      <svg class=\"ev-curtain-logo\" width=\"146\" height=\"170\" viewBox=\"0 0 300 350\" style=\"display: block; max-width: 32vw; height: auto;\">\n        <defs>\n          <linearGradient id=\"ev-badge-c\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#8B84FF\"></stop><stop offset=\"1\" stop-color=\"#5B4FE9\"></stop></linearGradient>\n        </defs>\n        <path d=\"M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z\" fill=\"url(#ev-badge-c)\"></path>\n        <text x=\"150\" y=\"212\" text-anchor=\"middle\" style=\"font-family: 'Outfit', sans-serif; font-size: 122px; font-weight: 800; letter-spacing: -6px; fill: #FFFFFF;\">SA</text>\n      </svg>\n      <div class=\"ev-curtain-text\" style=\"font-size: 42px; font-weight: 700; letter-spacing: -1.9px; line-height: 1.1; margin-top: 30px; white-space: nowrap;\">#studentalumni</div>\n      <div style=\"display: inline-flex; align-items: center; justify-content: center; gap: 10px; font-size: 14.5px; font-weight: 600; color: rgba(244,245,251,.8); margin-top: 14px; white-space: nowrap;\">\n        Built with love for students\n        <svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" style=\"fill: #8B84FF; flex: none;\"><path d=\"M12 21s-8-4.9-8-10.4A4.6 4.6 0 0 1 12 7.6 4.6 4.6 0 0 1 20 10.6C20 16.1 12 21 12 21Z\"></path></svg>\n        across all campus's\n      </div>\n    </div>\n    <div style=\"display: flex; align-items: flex-end; justify-content: space-between; gap: 30px; max-width: 1400px; width: 100%; margin: 0 auto;\">\n      <div style=\"font-size: 12px; font-weight: 700; letter-spacing: 3.4px; color: rgba(244,245,251,.62);\">LOADING</div>\n      <div id=\"ev-curtain-num\" style=\"font-size: 76px; font-weight: 700; letter-spacing: -3.2px; line-height: .85; font-variant-numeric: tabular-nums; color: #F4F5FB;\">00</div>\n    </div>\n    <div style=\"max-width: 1400px; width: 100%; margin: 16px auto 0; height: 2px; background: rgba(244,245,251,.14);\">\n      <div id=\"ev-curtain-bar\" style=\"height: 100%; width: 0%; background: linear-gradient(90deg, #7C5CFC, #A78BFA);\"></div>\n    </div>\n  </div>\n\n<div id=\"ev-root\" style=\"--bg: #0A0A14; --panel: #11111C; --panel2: #161622; --line: #1F1F30; --line2: #292940; --violet: #7C5CFC; --violet-lt: #A78BFA; --ok: #34D399; --amber: #F5B342; --text: #F4F4FA; --muted: #8A8A9E; --dim: #6A6A7E; font-family: 'Outfit', -apple-system, sans-serif; color: var(--text); background: var(--bg); min-height: 100vh;\">\n\n  <div id=\"ev-bgfx\" style=\"position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;\">\n    <div style=\"position: absolute; left: -14%; top: -22%; width: 780px; height: 620px; background: radial-gradient(circle, rgba(124,92,252,.20), transparent 68%); filter: blur(70px); animation: ev-drift 38s ease-in-out infinite;\"></div>\n    <div style=\"position: absolute; right: -18%; top: 30%; width: 680px; height: 560px; background: radial-gradient(circle, rgba(91,79,233,.14), transparent 70%); filter: blur(80px); animation: ev-drift 52s ease-in-out infinite reverse;\"></div>\n  </div>\n\n  <div id=\"ev-nav-slot\"></div>\n\n  <div id=\"ev-page-list\" style=\"position: relative; z-index: 1; max-width: 1400px; margin: 0 auto; padding: 32px 28px 90px;\">\n\n    <div class=\"ev-r\" style=\"position: relative; overflow: hidden; border-radius: 24px; background: linear-gradient(150deg, #FFFFFF 0%, #F4F2FF 42%, #EAF7FA 100%); box-shadow: 0 1px 2px rgba(16,18,32,.06), 0 26px 64px rgba(16,18,32,.24); padding: 34px 36px 36px; margin-bottom: 20px;\">\n      <div style=\"position: absolute; right: -6%; top: -48%; width: 480px; height: 480px; border-radius: 50%; background: radial-gradient(circle, rgba(124,92,252,.20), transparent 66%); pointer-events: none;\"></div>\n      <div style=\"position: absolute; left: 24%; bottom: -62%; width: 440px; height: 440px; border-radius: 50%; background: radial-gradient(circle, rgba(47,184,198,.16), transparent 68%); pointer-events: none;\"></div>\n      <div class=\"ev-herorow\" style=\"position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 420px); gap: 40px; align-items: center;\">\n        <div style=\"min-width: 0;\">\n          <div style=\"display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; letter-spacing: 1.6px; color: #2E2091; background: rgba(46,32,145,.10); border-radius: 100px; padding: 7px 14px;\">\n            <span style=\"width: 6px; height: 6px; border-radius: 50%; background: #2E2091;\"></span>\n            ON THE GROUND\n          </div>\n          <div style=\"font-size: 36px; font-weight: 700; letter-spacing: -1.6px; line-height: 1.1; color: #141726; margin: 18px 0 12px;\">The network is a feed until it meets in person.</div>\n          <div style=\"font-size: 16px; line-height: 1.65; color: #4A4F63; max-width: 480px;\">Eighty-six ECHO events across thirty-one campuses. Alumni in the room, recruiters at the table, and a build sprint that runs overnight.</div>\n          <div class=\"ev-herostats\" style=\"display: grid; grid-template-columns: repeat(3, max-content); gap: 34px; margin: 26px 0 24px;\">\n            <div>\n              <div style=\"font-size: 28px; font-weight: 700; letter-spacing: -1.1px; color: #4B3FD6;\">86</div>\n              <div style=\"font-size: 12.5px; color: #5F6474; margin-top: 4px;\">events run</div>\n            </div>\n            <div>\n              <div style=\"font-size: 28px; font-weight: 700; letter-spacing: -1.1px; color: #0E6E8C;\">31</div>\n              <div style=\"font-size: 12.5px; color: #5F6474; margin-top: 4px;\">cities</div>\n            </div>\n            <div>\n              <div style=\"font-size: 28px; font-weight: 700; letter-spacing: -1.1px; color: #A21C63;\">4.8</div>\n              <div style=\"font-size: 12.5px; color: #5F6474; margin-top: 4px;\">average rating</div>\n            </div>\n          </div>\n          <div style=\"display: flex; gap: 10px; flex-wrap: wrap;\">\n            <span id=\"ev-browse-btn\" class=\"ev-btn\" style=\"font-size: 14.5px; font-weight: 700; background: #4B3FD6; color: #FFFFFF; border-radius: 11px; padding: 14px 24px; cursor: pointer; transition: all .2s ease;\">Browse all events</span>\n            <span class=\"ev-btn\" data-nav=\"contact\" style=\"font-size: 14.5px; font-weight: 600; color: #2E2A55; border: 1px solid #CFC9F3; border-radius: 11px; padding: 14px 24px; cursor: pointer; transition: all .2s ease;\">Host on your campus</span>\n          </div>\n        </div>\n        <div class=\"ev-heromosaic\" style=\"display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: 96px 96px; gap: 10px;\">\n          <div style=\"grid-column: span 2; grid-row: span 2; border-radius: 14px; background: linear-gradient(135deg, #1B1838, #2E2091); display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 600;\">Keynote — Main Stage</div>\n          <div style=\"border-radius: 14px; background: #241A52; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.6); font-size: 11px; font-weight: 600;\">Crowd</div>\n          <div style=\"border-radius: 14px; background: #1A244D; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.6); font-size: 11px; font-weight: 600;\">Workshop</div>\n        </div>\n      </div>\n      <div style=\"position: relative; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; border-top: 1px solid rgba(20,23,38,.10); margin-top: 30px; padding-top: 22px;\">\n        <span style=\"font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; color: #5F6474;\">RECENT HOSTS</span>\n        <div style=\"display: flex; gap: 10px; flex-wrap: wrap;\">\n          <span style=\"font-size: 12.5px; font-weight: 600; color: #2E2A55; background: rgba(20,23,38,.05); border-radius: 100px; padding: 7px 14px;\">Sreenidhi Institute</span>\n          <span style=\"font-size: 12.5px; font-weight: 600; color: #2E2A55; background: rgba(20,23,38,.05); border-radius: 100px; padding: 7px 14px;\">VNR VJIET</span>\n          <span style=\"font-size: 12.5px; font-weight: 600; color: #2E2A55; background: rgba(20,23,38,.05); border-radius: 100px; padding: 7px 14px;\">Khammam Institute</span>\n          <span style=\"font-size: 12.5px; font-weight: 600; color: #2E2A55; background: rgba(20,23,38,.05); border-radius: 100px; padding: 7px 14px;\">CBIT Hyderabad</span>\n        </div>\n      </div>\n    </div>\n    <div class=\"ev-r\" style=\"position: relative; overflow: hidden; border: 1px solid #3A2E72; border-radius: 20px; background: linear-gradient(120deg, #241A52, #14122E 62%); padding: 30px 32px 34px;\">\n      <span style=\"display: inline-flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 700; letter-spacing: 1.4px; color: var(--violet-lt); background: rgba(124,92,252,.18); border-radius: 100px; padding: 7px 14px;\">\n        <svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" style=\"fill: currentColor;\"><path d=\"M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9Z\"></path></svg>\n        ECHO EVENTS\n      </span>\n      <div style=\"font-size: 34px; font-weight: 700; letter-spacing: -1.2px; margin: 18px 0 10px;\">Explore ECHO Events by College</div>\n      <div style=\"font-size: 15px; line-height: 1.6; color: #BEB6E8; max-width: 620px;\">Image galleries, partners, sponsors, speakers, testimonials and registration for every ECHO event we've conducted.</div>\n    </div>\n\n    <div class=\"ev-r ev-grid2\" style=\"display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-top: 22px;\">\n      <div class=\"ev-card\" id=\"ev-open-snist\" style=\"border: 1px solid var(--line); border-radius: 18px; background: var(--panel); overflow: hidden; cursor: pointer; transition: transform .25s cubic-bezier(.2,.8,.2,1), border-color .25s ease;\">\n        <div style=\"position: relative; height: 188px; background: linear-gradient(135deg, #2E2091, #14122E); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;\">\n          HackWave 3.0 · SNIST\n        </div>\n        <div style=\"padding: 18px 20px 20px;\">\n          <div style=\"display: flex; gap: 8px; margin-bottom: 13px;\">\n            <span style=\"font-size: 10.5px; font-weight: 700; letter-spacing: .8px; color: var(--amber); background: rgba(245,179,66,.13); border: 1px solid #4A3410; border-radius: 7px; padding: 5px 10px;\">UPCOMING</span>\n            <span style=\"display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: .8px; color: var(--violet-lt); background: rgba(124,92,252,.14); border: 1px solid #2E2A55; border-radius: 7px; padding: 5px 10px;\">\n              <svg width=\"11\" height=\"11\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 2;\"><path d=\"M4 20V8l8-4 8 4v12M9 20v-5h6v5\"></path></svg>SNIST\n            </span>\n          </div>\n          <div style=\"font-size: 19px; font-weight: 700; letter-spacing: -.4px; margin-bottom: 7px;\">Hack Wave 3.0 – SNIST</div>\n          <div style=\"font-size: 13.5px; line-height: 1.55; color: var(--muted); margin-bottom: 15px;\">Empowering Tomorrow's Leaders | Organized by cdc snist and in collaboration with StudentAlumni.ai</div>\n          <div style=\"display: grid; gap: 8px; margin-bottom: 16px;\">\n            <div style=\"display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--muted);\">\n              <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.8; flex: none;\"><rect x=\"3.5\" y=\"5\" width=\"17\" height=\"15\" rx=\"2.5\"></rect><path d=\"M3.5 10h17M8 5V2.5M16 5V2.5\"></path></svg>\n              September 04, 2026\n            </div>\n            <div style=\"display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--muted);\">\n              <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.8; flex: none;\"><path d=\"M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11Z\"></path><circle cx=\"12\" cy=\"10\" r=\"2.4\"></circle></svg>\n              Sreenidhi Institute of Science &amp; Technology\n            </div>\n          </div>\n          <span style=\"display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: var(--violet-lt);\">View event\n            <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 2;\"><path d=\"M4 12h15M13 6l6 6-6 6\"></path></svg>\n          </span>\n        </div>\n      </div>\n\n      <div class=\"ev-card\" style=\"border: 1px solid var(--line); border-radius: 18px; background: var(--panel); overflow: hidden; cursor: pointer; transition: transform .25s cubic-bezier(.2,.8,.2,1), border-color .25s ease;\">\n        <div style=\"position: relative; height: 188px; background: linear-gradient(135deg, #1B1838, #0E6E8C); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;\">\n          VNR ECHO 2026\n        </div>\n        <div style=\"padding: 18px 20px 20px;\">\n          <div style=\"display: flex; gap: 8px; margin-bottom: 13px;\">\n            <span style=\"font-size: 10.5px; font-weight: 700; letter-spacing: .8px; color: var(--amber); background: rgba(245,179,66,.13); border: 1px solid #4A3410; border-radius: 7px; padding: 5px 10px;\">COMPLETED</span>\n          </div>\n          <div style=\"font-size: 19px; font-weight: 700; letter-spacing: -.4px; margin-bottom: 7px;\">VNR ECHO 2026</div>\n          <div style=\"font-size: 13.5px; line-height: 1.55; color: var(--muted); margin-bottom: 15px;\">Empowering Tomorrow's Leaders</div>\n          <div style=\"display: grid; gap: 8px; margin-bottom: 16px;\">\n            <div style=\"display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--muted);\">\n              <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.8; flex: none;\"><rect x=\"3.5\" y=\"5\" width=\"17\" height=\"15\" rx=\"2.5\"></rect><path d=\"M3.5 10h17M8 5V2.5M16 5V2.5\"></path></svg>\n              July 31, 2026\n            </div>\n            <div style=\"display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--muted);\">\n              <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.8; flex: none;\"><path d=\"M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11Z\"></path><circle cx=\"12\" cy=\"10\" r=\"2.4\"></circle></svg>\n              Main Auditorium, VNR VJIET\n            </div>\n          </div>\n          <span style=\"display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: var(--violet-lt);\">View event\n            <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 2;\"><path d=\"M4 12h15M13 6l6 6-6 6\"></path></svg>\n          </span>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div id=\"ev-page-detail\" style=\"display: none; position: relative; z-index: 1; max-width: 1400px; margin: 0 auto; padding: 26px 28px 90px;\">\n    <span class=\"ev-back\" style=\"display: inline-flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 600; border: 1px solid var(--line2); border-radius: 100px; padding: 10px 18px; background: var(--panel); cursor: pointer; transition: all .2s ease; margin-bottom: 20px;\">\n      <svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 2;\"><path d=\"M20 12H5M11 6l-6 6 6 6\"></path></svg>Back\n    </span>\n\n    <div class=\"ev-d\" style=\"border: 1px solid var(--line2); border-radius: 22px; overflow: hidden; background: var(--panel);\">\n      <div style=\"position: relative; height: 340px; background: linear-gradient(135deg, #2E2091, #14122E); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 32px; font-weight: 800;\">\n        HackWave 3.0 · SNIST Event Stage\n      </div>\n      <div style=\"position: relative; background: var(--panel); padding: 24px 30px 26px;\">\n        <div style=\"display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 14px;\">\n          <span style=\"display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; letter-spacing: .9px; color: var(--amber); background: rgba(245,179,66,.15); border: 1px solid #4A3410; border-radius: 100px; padding: 6px 13px;\">\n            <span style=\"width: 6px; height: 6px; border-radius: 50%; background: var(--amber); animation: ev-dot 2s ease-in-out infinite;\"></span>UPCOMING\n          </span>\n          <span style=\"font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: var(--muted);\">CDC SNIST AND IN COLLABORATION WITH STUDENTALUMNI.AI</span>\n        </div>\n        <div style=\"font-size: 32px; font-weight: 700; letter-spacing: -1.1px;\">Hack Wave 3.0 – <span style=\"color: var(--violet-lt);\">SNIST</span></div>\n        <div style=\"font-size: 14.5px; line-height: 1.6; color: var(--muted); margin: 8px 0 16px; max-width: 640px;\">Empowering Tomorrow's Leaders | Organized by cdc snist and in collaboration with StudentAlumni.ai</div>\n        <div style=\"display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;\">\n          <span style=\"font-size: 12.5px; font-weight: 600; color: var(--amber); background: rgba(245,179,66,.12); border: 1px solid #4A3410; border-radius: 100px; padding: 8px 14px;\">Sep 4 – 5, 2026</span>\n          <span style=\"font-size: 12.5px; font-weight: 600; color: #7FB2F7; background: rgba(76,141,246,.12); border: 1px solid #23407A; border-radius: 100px; padding: 8px 14px;\">₹50,000 prize pool</span>\n          <span style=\"font-size: 12.5px; font-weight: 600; color: #6FD6FF; background: rgba(47,184,198,.12); border: 1px solid #1F4E5C; border-radius: 100px; padding: 8px 14px;\">SNIST Campus, Hyderabad</span>\n          <span style=\"display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--amber); border: 1px solid #4A3410; border-radius: 100px; padding: 8px 14px;\">\n            <svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 2;\"><circle cx=\"12\" cy=\"12\" r=\"8.5\"></circle><path d=\"M12 8v4.5l3 1.8\"></path></svg>\n            Registration closes: 2026-09-01\n          </span>\n        </div>\n        <div class=\"ev-heroft\" style=\"display: flex; align-items: center; justify-content: space-between; gap: 20px; border-top: 1px solid var(--line); padding-top: 20px; flex-wrap: wrap;\">\n          <div style=\"display: flex; gap: 20px; flex-wrap: wrap;\">\n            <span style=\"display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--muted);\">\n              <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.8;\"><rect x=\"3.5\" y=\"5\" width=\"17\" height=\"15\" rx=\"2.5\"></rect><path d=\"M3.5 10h17M8 5V2.5M16 5V2.5\"></path></svg>\n              September 04, 2026 – September 05, 2026\n            </span>\n            <span style=\"display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--muted);\">\n              <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.8;\"><circle cx=\"12\" cy=\"12\" r=\"8.5\"></circle><path d=\"M12 8v4.5l3 1.8\"></path></svg>\n              09:00 AM\n            </span>\n            <span style=\"display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--muted);\">\n              <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.8;\"><path d=\"M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11Z\"></path><circle cx=\"12\" cy=\"10\" r=\"2.4\"></circle></svg>\n              Sreenidhi Institute of Science &amp; Technology\n            </span>\n          </div>\n          <div style=\"display: flex; gap: 10px; flex-wrap: wrap;\">\n            <span id=\"ev-to-reg\" class=\"ev-btn\" style=\"display: inline-flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 700; background: #0E9F6E; color: #FFFFFF; border-radius: 10px; padding: 12px 20px; cursor: pointer; transition: all .2s ease;\">\n              <svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.9;\"><path d=\"M3 8.5A2.5 2.5 0 015.5 6h13A2.5 2.5 0 0121 8.5v.5a2 2 0 000 6v.5A2.5 2.5 0 0118.5 18h-13A2.5 2.5 0 013 15.5V15a2 2 0 000-6Z\"></path></svg>\n              Register\n            </span>\n            <span class=\"ev-btn\" style=\"display: inline-flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 600; background: var(--violet); color: #FFFFFF; border-radius: 10px; padding: 12px 20px; cursor: pointer; transition: all .2s ease;\">\n              <svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.8;\"><path d=\"M6 3h8l4 4v14H6Z\"></path><path d=\"M14 3v4h4\"></path></svg>\n              Event Handbook (PDF)\n            </span>\n            <span class=\"ev-ghostb\" style=\"display: inline-flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 600; border: 1px solid var(--line2); border-radius: 10px; padding: 12px 20px; cursor: pointer; transition: all .2s ease;\">\n              <svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.8;\"><circle cx=\"18\" cy=\"5.5\" r=\"2.6\"></circle><circle cx=\"6\" cy=\"12\" r=\"2.6\"></circle><circle cx=\"18\" cy=\"18.5\" r=\"2.6\"></circle><path d=\"M8.4 10.7l7.2-3.9M8.4 13.3l7.2 3.9\"></path></svg>\n              Share\n            </span>\n          </div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"ev-dgrid\" style=\"display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 20px; margin-top: 20px; align-items: start;\">\n      <div class=\"ev-d\" style=\"border: 1px solid var(--line); border-radius: 18px; background: var(--panel); padding: 24px 26px 26px;\">\n        <div style=\"font-size: 19px; font-weight: 700; letter-spacing: -.4px;\">About the Event</div>\n        <div style=\"font-size: 14px; color: var(--muted); margin: 7px 0 20px;\">A day of inspiration, learning, and networking</div>\n        <div class=\"ev-grid3\" style=\"display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px;\">\n          <div class=\"ev-mini\" style=\"border: 1px solid var(--line2); border-radius: 14px; background: var(--panel2); padding: 20px 16px; text-align: center; transition: border-color .25s ease, transform .25s ease;\">\n            <span style=\"width: 38px; height: 38px; border-radius: 11px; background: rgba(124,92,252,.14); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;\">\n              <svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: var(--violet-lt); stroke-width: 1.8;\"><path d=\"M4 5.5l6-1.5 4 1.5 6-1.5v14l-6 1.5-4-1.5-6 1.5zM10 4v14\"></path></svg>\n            </span>\n            <div style=\"font-size: 15px; font-weight: 700;\">Learn</div>\n            <div style=\"font-size: 12.5px; color: var(--muted); margin-top: 4px;\">Industry insights</div>\n          </div>\n          <div class=\"ev-mini\" style=\"border: 1px solid var(--line2); border-radius: 14px; background: var(--panel2); padding: 20px 16px; text-align: center; transition: border-color .25s ease, transform .25s ease;\">\n            <span style=\"width: 38px; height: 38px; border-radius: 11px; background: rgba(124,92,252,.14); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;\">\n              <svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: var(--violet-lt); stroke-width: 1.8;\"><rect x=\"9\" y=\"3.5\" width=\"6\" height=\"5\" rx=\"1.5\"></rect><rect x=\"3\" y=\"15.5\" width=\"6\" height=\"5\" rx=\"1.5\"></rect><rect x=\"15\" y=\"15.5\" width=\"6\" height=\"5\" rx=\"1.5\"></rect><path d=\"M12 8.5v3.5M6 15.5V12h12v3.5\"></path></svg>\n            </span>\n            <div style=\"font-size: 15px; font-weight: 700;\">Connect</div>\n            <div style=\"font-size: 12.5px; color: var(--muted); margin-top: 4px;\">Build your network</div>\n          </div>\n          <div class=\"ev-mini\" style=\"border: 1px solid var(--line2); border-radius: 14px; background: var(--panel2); padding: 20px 16px; text-align: center; transition: border-color .25s ease, transform .25s ease;\">\n            <span style=\"width: 38px; height: 38px; border-radius: 11px; background: rgba(124,92,252,.14); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;\">\n              <svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: var(--violet-lt); stroke-width: 1.8;\"><path d=\"M4 17l5-5 3 3 6-7M14 8h5v5\"></path></svg>\n            </span>\n            <div style=\"font-size: 15px; font-weight: 700;\">Grow</div>\n            <div style=\"font-size: 12.5px; color: var(--muted); margin-top: 4px;\">Shape your future</div>\n          </div>\n        </div>\n      </div>\n\n      <div class=\"ev-d\" style=\"border: 1px solid var(--line); border-radius: 18px; background: var(--panel); padding: 24px 26px 26px;\">\n        <div style=\"font-size: 19px; font-weight: 700; letter-spacing: -.4px; margin-bottom: 18px;\">Event Organized By</div>\n        <div style=\"display: flex; align-items: center; gap: 13px; margin-bottom: 22px;\">\n          <svg width=\"34\" height=\"38\" viewBox=\"0 0 300 350\" style=\"flex: none;\"><path d=\"M150 8 L288 52 v128 c0 84 -70 128 -138 154 C82 308 12 264 12 180 V52 Z\" fill=\"url(#ev-badge)\"></path><text x=\"150\" y=\"212\" text-anchor=\"middle\" style=\"font-family: 'Outfit', sans-serif; font-size: 124px; font-weight: 700; fill: #FFFFFF;\">SA</text></svg>\n          <div style=\"min-width: 0;\">\n            <div style=\"font-size: 14.5px; font-weight: 700; line-height: 1.4;\">CDC SNIST and in collaboration with StudentAlumni.ai</div>\n            <div style=\"font-size: 12.5px; color: var(--muted); margin-top: 3px;\">SNIST</div>\n          </div>\n        </div>\n        <div style=\"font-size: 13.5px; font-weight: 700; margin-bottom: 12px;\">In Association With</div>\n        <div style=\"display: flex; gap: 9px; flex-wrap: wrap;\">\n          <span style=\"font-size: 13px; font-weight: 500; color: var(--text); border: 1px solid var(--line2); background: var(--panel2); border-radius: 100px; padding: 9px 15px;\">CodeSpectra</span>\n          <span style=\"font-size: 13px; font-weight: 500; color: var(--text); border: 1px solid var(--line2); background: var(--panel2); border-radius: 100px; padding: 9px 15px;\">Featherless</span>\n          <span style=\"font-size: 13px; font-weight: 500; color: var(--text); border: 1px solid var(--line2); background: var(--panel2); border-radius: 100px; padding: 9px 15px;\">Stepupmark</span>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"ev-d\" style=\"margin-top: 28px;\">\n      <div style=\"font-size: 19px; font-weight: 700; letter-spacing: -.4px; margin-bottom: 14px;\">Moments from the Event</div>\n      <div style=\"border: 1px solid var(--line); border-radius: 18px; background: var(--panel); padding: 56px 24px; text-align: center;\">\n        <svg width=\"30\" height=\"30\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: var(--dim); stroke-width: 1.6; margin-bottom: 12px;\"><circle cx=\"10.5\" cy=\"10.5\" r=\"6.5\"></circle><path d=\"M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6\"></path></svg>\n        <div style=\"font-size: 14px; color: var(--muted);\">No photos yet. Upload gallery photos via Admin CMS.</div>\n      </div>\n    </div>\n\n    <div class=\"ev-d\" style=\"margin-top: 28px;\">\n      <div style=\"font-size: 19px; font-weight: 700; letter-spacing: -.4px; margin-bottom: 22px;\">Event Highlights</div>\n      <div class=\"ev-grid4\" style=\"display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0;\">\n        <div style=\"position: relative; text-align: center; padding: 0 12px;\">\n          <span class=\"ev-hl\" style=\"position: relative; z-index: 1; width: 48px; height: 48px; border-radius: 50%; border: 1px solid #3A2E72; background: var(--bg); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; transition: all .3s ease;\">\n            <svg width=\"19\" height=\"19\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: var(--violet-lt); stroke-width: 1.8;\"><path d=\"M12 4l2.3 5.1L20 10l-4 3.8 1 5.7-5-2.9-5 2.9 1-5.7L4 10l5.7-.9Z\"></path></svg>\n          </span>\n          <span class=\"ev-hlline\" style=\"position: absolute; left: 50%; top: 24px; right: -50%; height: 1px; background: #2E2A55;\"></span>\n          <div style=\"font-size: 14.5px; font-weight: 700;\">Inspiring Keynotes</div>\n          <div style=\"font-size: 12.5px; line-height: 1.5; color: var(--muted); margin-top: 6px;\">Industry leaders shared their journey and insights</div>\n        </div>\n        <div style=\"position: relative; text-align: center; padding: 0 12px;\">\n          <span class=\"ev-hl\" style=\"position: relative; z-index: 1; width: 48px; height: 48px; border-radius: 50%; border: 1px solid #3A2E72; background: var(--bg); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; transition: all .3s ease;\">\n            <svg width=\"19\" height=\"19\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: var(--violet-lt); stroke-width: 1.8;\"><circle cx=\"9\" cy=\"9\" r=\"3\"></circle><path d=\"M3 19q6-6 12 0M16.5 7a3 3 0 010 6\"></path></svg>\n          </span>\n          <span class=\"ev-hlline\" style=\"position: absolute; left: 50%; top: 24px; right: -50%; height: 1px; background: #2E2A55;\"></span>\n          <div style=\"font-size: 14.5px; font-weight: 700;\">Panel Discussions</div>\n          <div style=\"font-size: 12.5px; line-height: 1.5; color: var(--muted); margin-top: 6px;\">Engaging conversations on career and tech trends</div>\n        </div>\n        <div style=\"position: relative; text-align: center; padding: 0 12px;\">\n          <span class=\"ev-hl\" style=\"position: relative; z-index: 1; width: 48px; height: 48px; border-radius: 50%; border: 1px solid #3A2E72; background: var(--bg); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; transition: all .3s ease;\">\n            <svg width=\"19\" height=\"19\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: var(--violet-lt); stroke-width: 1.8;\"><path d=\"M13 2L5 13h6l-1 9 8-11h-6Z\"></path></svg>\n          </span>\n          <span class=\"ev-hlline\" style=\"position: absolute; left: 50%; top: 24px; right: -50%; height: 1px; background: #2E2A55;\"></span>\n          <div style=\"font-size: 14.5px; font-weight: 700;\">Hands-on Workshops</div>\n          <div style=\"font-size: 12.5px; line-height: 1.5; color: var(--muted); margin-top: 6px;\">Practical learning and skill-building sessions</div>\n        </div>\n        <div style=\"position: relative; text-align: center; padding: 0 12px;\">\n          <span class=\"ev-hl\" style=\"position: relative; z-index: 1; width: 48px; height: 48px; border-radius: 50%; border: 1px solid #3A2E72; background: var(--bg); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; transition: all .3s ease;\">\n            <svg width=\"19\" height=\"19\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: var(--violet-lt); stroke-width: 1.8;\"><rect x=\"9\" y=\"3.5\" width=\"6\" height=\"5\" rx=\"1.5\"></rect><rect x=\"3\" y=\"15.5\" width=\"6\" height=\"5\" rx=\"1.5\"></rect><rect x=\"15\" y=\"15.5\" width=\"6\" height=\"5\" rx=\"1.5\"></rect><path d=\"M12 8.5v3.5M6 15.5V12h12v3.5\"></path></svg>\n          </span>\n          <div style=\"font-size: 14.5px; font-weight: 700;\">Networking Sessions</div>\n          <div style=\"font-size: 12.5px; line-height: 1.5; color: var(--muted); margin-top: 6px;\">Students connected with experts and alumni</div>\n        </div>\n      </div>\n    </div>\n\n    <div class=\"ev-d ev-cta\" style=\"display: flex; align-items: center; justify-content: space-between; gap: 24px; border: 1px solid #4B3FA8; border-radius: 18px; background: linear-gradient(100deg, #3B2A86, #2A1F63 70%); padding: 24px 28px; margin-top: 28px; flex-wrap: wrap;\">\n      <div style=\"display: flex; align-items: center; gap: 16px; min-width: 0;\">\n        <span style=\"width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,.14); display: flex; align-items: center; justify-content: center; flex: none;\">\n          <svg width=\"21\" height=\"21\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: #E7DEFF; stroke-width: 1.8;\"><rect x=\"3.5\" y=\"5\" width=\"17\" height=\"15\" rx=\"2.5\"></rect><path d=\"M3.5 10h17M8 5V2.5M16 5V2.5\"></path></svg>\n        </span>\n        <div style=\"min-width: 0;\">\n          <div style=\"font-size: 19px; font-weight: 700; letter-spacing: -.4px;\">Stay tuned for more events!</div>\n          <div style=\"font-size: 14px; color: #C9BFF2; margin-top: 4px;\">Join our community and never miss an opportunity to learn, connect, and grow.</div>\n        </div>\n      </div>\n      <span class=\"ev-btn ev-back\" style=\"font-size: 14px; font-weight: 700; background: #8B5CF6; color: #FFFFFF; border-radius: 10px; padding: 13px 22px; cursor: pointer; transition: all .2s ease; flex: none;\">View Upcoming Events</span>\n    </div>\n  </div>\n\n  <div id=\"ev-page-reg\" style=\"display: none; position: relative; z-index: 1; max-width: 1400px; margin: 0 auto; padding: 26px 28px 90px;\">\n    <span class=\"ev-back-detail\" style=\"display: inline-flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 600; border: 1px solid var(--line2); border-radius: 100px; padding: 10px 18px; background: var(--panel); cursor: pointer; transition: all .2s ease; margin-bottom: 20px;\">\n      <svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 2;\"><path d=\"M20 12H5M11 6l-6 6 6 6\"></path></svg>Back to event\n    </span>\n\n    <div class=\"ev-g\" style=\"position: relative; overflow: hidden; border: 1px solid var(--line2); border-radius: 18px; background: linear-gradient(115deg, #1B1836, #12121F 68%); padding: 22px 26px 24px;\">\n      <span style=\"display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: var(--violet-lt); background: rgba(124,92,252,.18); border-radius: 8px; padding: 6px 12px;\">\n        <svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 2;\"><path d=\"M3 8.5A2.5 2.5 0 015.5 6h13A2.5 2.5 0 0121 8.5v.5a2 2 0 000 6v.5A2.5 2.5 0 0118.5 18h-13A2.5 2.5 0 013 15.5V15a2 2 0 000-6Z\"></path></svg>\n        REGISTER\n      </span>\n      <div style=\"font-size: 26px; font-weight: 700; letter-spacing: -.9px; margin: 14px 0 6px;\">Hack Wave 3.0 – SNIST</div>\n      <div style=\"font-size: 13.5px; color: var(--muted); margin-bottom: 16px;\">Organized by CDC SNIST and in collaboration with StudentAlumni.ai</div>\n      <div style=\"display: grid; gap: 9px;\">\n        <div style=\"display: flex; align-items: center; gap: 9px; font-size: 13.5px; color: var(--muted);\">\n          <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.8; flex: none;\"><rect x=\"3.5\" y=\"5\" width=\"17\" height=\"15\" rx=\"2.5\"></rect><path d=\"M3.5 10h17M8 5V2.5M16 5V2.5\"></path></svg>\n          September 04, 2026 – September 05, 2026\n        </div>\n        <div style=\"display: flex; align-items: center; gap: 9px; font-size: 13.5px; color: var(--muted);\">\n          <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.8; flex: none;\"><circle cx=\"12\" cy=\"12\" r=\"8.5\"></circle><path d=\"M12 8v4.5l3 1.8\"></path></svg>\n          09:00 AM\n        </div>\n        <div style=\"display: flex; align-items: center; gap: 9px; font-size: 13.5px; color: var(--muted);\">\n          <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.8; flex: none;\"><path d=\"M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11Z\"></path><circle cx=\"12\" cy=\"10\" r=\"2.4\"></circle></svg>\n          Sreenidhi Institute of Science &amp; Technology\n        </div>\n      </div>\n    </div>\n\n    <div class=\"ev-rgrid\" style=\"display: grid; grid-template-columns: minmax(0, 1fr) 560px; gap: 22px; margin-top: 20px; align-items: start;\">\n      <div class=\"ev-g\" style=\"border: 1px solid var(--line); border-radius: 18px; background: var(--panel); padding: 20px;\">\n        <div style=\"position: relative; border-radius: 14px; overflow: hidden; background: linear-gradient(135deg, #2E2091, #1B1838); aspect-ratio: 3 / 4; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center;\">\n          <div style=\"font-size: 12px; font-weight: 700; letter-spacing: 2px; color: #A78BFA; margin-bottom: 12px;\">HACKWAVE 3.0</div>\n          <div style=\"font-size: 28px; font-weight: 800; line-height: 1.15; color: #FFFFFF; margin-bottom: 14px;\">Build. Innovate. Win.</div>\n          <div style=\"font-size: 14px; color: #C4B5FD;\">₹50,000 Prize Pool · SNIST Campus</div>\n        </div>\n      </div>\n\n      <div style=\"display: grid; gap: 16px;\">\n        <div class=\"ev-g\" style=\"display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;\">\n          <span class=\"ev-seg\" data-on=\"1\" style=\"height: 52px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--line2); border-radius: 12px; background: var(--panel); font-size: 15px; font-weight: 600; cursor: pointer;\">Individual</span>\n          <span class=\"ev-seg\" style=\"height: 52px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--line2); border-radius: 12px; background: var(--panel); font-size: 15px; font-weight: 600; cursor: pointer;\">Team (up to 5)</span>\n        </div>\n\n        <div class=\"ev-g\" style=\"display: flex; align-items: center; justify-content: space-between; gap: 16px; border: 1px solid var(--line); border-radius: 16px; background: var(--panel); padding: 18px 20px; flex-wrap: wrap;\">\n          <div style=\"display: flex; align-items: center; gap: 13px; min-width: 0;\">\n            <span style=\"width: 40px; height: 40px; border-radius: 11px; background: rgba(124,92,252,.14); display: flex; align-items: center; justify-content: center; flex: none;\">\n              <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: var(--violet-lt); stroke-width: 1.8;\"><rect x=\"3\" y=\"5.5\" width=\"18\" height=\"13\" rx=\"2.5\"></rect><path d=\"M3 10h18\"></path></svg>\n            </span>\n            <div>\n              <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 1.3px; color: var(--muted);\">REGISTRATION FEE</div>\n              <div id=\"ev-fee\" style=\"font-size: 22px; font-weight: 700; letter-spacing: -.6px; margin-top: 3px;\">INR 599</div>\n              <div style=\"display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--muted); margin-top: 6px;\">\n                <svg width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.8;\"><circle cx=\"9\" cy=\"9\" r=\"3\"></circle><path d=\"M3 19q6-6 12 0\"></path></svg>\n                <span id=\"ev-seats\">985 seats available</span>\n              </div>\n            </div>\n          </div>\n          <span style=\"display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: var(--ok); border: 1px solid #17503E; border-radius: 100px; padding: 7px 12px; flex: none;\">\n            <svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 2;\"><path d=\"M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6Z\"></path><path d=\"M9 12l2 2 4-4\"></path></svg>\n            Secure payment\n          </span>\n        </div>\n\n        <div class=\"ev-g ev-actions\" style=\"display: grid; grid-template-columns: minmax(0, 1fr) max-content; gap: 12px;\">\n          <span class=\"ev-btn\" style=\"display: inline-flex; align-items: center; justify-content: center; gap: 9px; font-size: 14px; font-weight: 600; border: 1px solid #3A2E72; border-radius: 12px; background: rgba(124,92,252,.14); color: var(--text); padding: 14px 18px; cursor: pointer; transition: all .2s ease;\">\n            <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: var(--violet-lt); stroke-width: 1.8;\"><path d=\"M6 3h8l4 4v14H6Z\"></path><path d=\"M14 3v4h4\"></path></svg>\n            Download Event Handbook (PDF)\n          </span>\n          <span class=\"ev-btn\" style=\"display: inline-flex; align-items: center; justify-content: center; gap: 9px; font-size: 14px; font-weight: 600; border: 1px solid #17503E; border-radius: 12px; background: rgba(16,185,129,.12); color: var(--ok); padding: 14px 20px; cursor: pointer; transition: all .2s ease;\">\n            <svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.8;\"><circle cx=\"18\" cy=\"5.5\" r=\"2.6\"></circle><circle cx=\"6\" cy=\"12\" r=\"2.6\"></circle><circle cx=\"18\" cy=\"18.5\" r=\"2.6\"></circle><path d=\"M8.4 10.7l7.2-3.9M8.4 13.3l7.2 3.9\"></path></svg>\n            Share Event\n          </span>\n        </div>\n\n        <div class=\"ev-g\" style=\"border: 1px solid var(--line); border-radius: 18px; background: var(--panel); padding: 24px 26px 26px;\">\n          <div style=\"font-size: 19px; font-weight: 700; letter-spacing: -.4px; margin-bottom: 22px;\">Registration Details</div>\n          <div style=\"display: grid; gap: 18px;\">\n            <div>\n              <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: var(--muted); margin-bottom: 9px;\">FULL NAME *</div>\n              <input class=\"ev-field\" type=\"text\" placeholder=\"Your full name\" style=\"width: 100%; border: 1px solid var(--line2); border-radius: 11px; background: var(--panel2); padding: 14px 15px; font-size: 14.5px; color: var(--text); outline: none; font-family: inherit;\">\n            </div>\n            <div>\n              <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: var(--muted); margin-bottom: 9px;\">EMAIL *</div>\n              <input class=\"ev-field\" type=\"email\" placeholder=\"you@example.com\" style=\"width: 100%; border: 1px solid var(--line2); border-radius: 11px; background: var(--panel2); padding: 14px 15px; font-size: 14.5px; color: var(--text); outline: none; font-family: inherit;\">\n            </div>\n            <div>\n              <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: var(--muted); margin-bottom: 9px;\">PHONE NUMBER *</div>\n              <input class=\"ev-field\" type=\"tel\" placeholder=\"+91 …\" style=\"width: 100%; border: 1px solid var(--line2); border-radius: 11px; background: var(--panel2); padding: 14px 15px; font-size: 14.5px; color: var(--text); outline: none; font-family: inherit;\">\n            </div>\n            <div>\n              <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: var(--muted); margin-bottom: 9px;\">DATE OF BIRTH</div>\n              <input class=\"ev-field\" type=\"text\" placeholder=\"YYYY-MM-DD\" style=\"width: 100%; border: 1px solid var(--line2); border-radius: 11px; background: var(--panel2); padding: 14px 15px; font-size: 14.5px; color: var(--text); outline: none; font-family: inherit;\">\n            </div>\n            <div class=\"ev-fgrid\" style=\"display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;\">\n              <div>\n                <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: var(--muted); margin-bottom: 9px;\">BRANCH</div>\n                <input class=\"ev-field\" type=\"text\" placeholder=\"Select your B.Tech branch\" style=\"width: 100%; border: 1px solid var(--line2); border-radius: 11px; background: var(--panel2); padding: 14px 15px; font-size: 14.5px; color: var(--text); outline: none; font-family: inherit;\">\n              </div>\n              <div>\n                <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: var(--muted); margin-bottom: 9px;\">CURRENT B.TECH YEAR</div>\n                <input class=\"ev-field\" type=\"text\" placeholder=\"Select your current year\" style=\"width: 100%; border: 1px solid var(--line2); border-radius: 11px; background: var(--panel2); padding: 14px 15px; font-size: 14.5px; color: var(--text); outline: none; font-family: inherit;\">\n              </div>\n            </div>\n            <div>\n              <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: var(--muted); margin-bottom: 9px;\">HACKWAVE 3.0 TRACK / THEME (OPTIONAL)</div>\n              <input class=\"ev-field\" type=\"text\" placeholder=\"Select theme (Optional — can choose on event day)\" style=\"width: 100%; border: 1px solid var(--line2); border-radius: 11px; background: var(--panel2); padding: 14px 15px; font-size: 14.5px; color: var(--text); outline: none; font-family: inherit;\">\n            </div>\n            <div>\n              <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: var(--muted); margin-bottom: 9px;\">COLLEGE</div>\n              <input class=\"ev-field\" type=\"text\" value=\"SNIST\" style=\"width: 100%; border: 1px solid var(--line2); border-radius: 11px; background: var(--panel2); padding: 14px 15px; font-size: 14.5px; color: var(--text); outline: none; font-family: inherit;\">\n            </div>\n          </div>\n\n          <div style=\"display: grid; gap: 10px; margin-top: 24px;\">\n            <div id=\"ev-terms\" style=\"display: flex; align-items: center; gap: 12px; cursor: pointer;\">\n              <span id=\"ev-terms-box\" style=\"width: 22px; height: 22px; border-radius: 6px; border: 1.5px solid var(--line2); display: flex; align-items: center; justify-content: center; flex: none; transition: all .25s ease;\">\n                <svg width=\"12\" height=\"12\" viewBox=\"0 0 12 12\" style=\"fill: none; stroke: #FFFFFF; stroke-width: 2.2; opacity: 0; transition: opacity .2s ease;\"><path d=\"M2 6.4l2.6 2.6L10 3.4\"></path></svg>\n              </span>\n              <span style=\"font-size: 14px;\">I have read and agree to the <span style=\"color: var(--violet-lt); text-decoration: underline;\">Terms &amp; Conditions</span></span>\n            </div>\n            <div id=\"ev-terms-err\" style=\"font-size: 13.5px; color: #F0616B;\">Please accept the Terms &amp; Conditions to continue.</div>\n            <div id=\"ev-wa\" style=\"display: flex; align-items: center; gap: 12px; cursor: pointer; margin-top: 6px;\">\n              <span id=\"ev-wa-box\" style=\"width: 22px; height: 22px; border-radius: 6px; border: 1.5px solid var(--violet); background: var(--violet); display: flex; align-items: center; justify-content: center; flex: none; transition: all .25s ease;\">\n                <svg width=\"12\" height=\"12\" viewBox=\"0 0 12 12\" style=\"fill: none; stroke: #FFFFFF; stroke-width: 2.2; opacity: 1; transition: opacity .2s ease;\"><path d=\"M2 6.4l2.6 2.6L10 3.4\"></path></svg>\n              </span>\n              <span style=\"font-size: 14px;\">Send my entry passes, invoices &amp; coupons via WhatsApp</span>\n            </div>\n          </div>\n\n          <div id=\"ev-pay\" style=\"position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; gap: 11px; border-radius: 12px; background: var(--line2); color: var(--dim); font-size: 15.5px; font-weight: 700; padding: 17px; margin-top: 22px; cursor: not-allowed; transition: all .3s ease;\">\n            <svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: currentColor; stroke-width: 1.8;\"><rect x=\"3\" y=\"5.5\" width=\"18\" height=\"13\" rx=\"2.5\"></rect><path d=\"M3 10h18\"></path></svg>\n            <span id=\"ev-pay-label\">Pay INR 599 via Razorpay</span>\n            <span id=\"ev-pay-sheen\" style=\"position: absolute; top: 0; bottom: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent); opacity: 0;\"></span>\n          </div>\n          <div style=\"font-size: 12.5px; line-height: 1.6; color: var(--muted); text-align: center; margin-top: 14px;\">By registering you agree to receive event updates. Payment is processed securely via Razorpay.</div>\n        </div>\n\n        <div class=\"ev-g\" style=\"border: 1px solid #3A2E72; border-radius: 18px; background: linear-gradient(155deg, #1B1838, var(--panel) 62%); padding: 22px 24px 24px;\">\n          <div style=\"display: flex; align-items: center; gap: 9px; margin-bottom: 20px;\">\n            <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: var(--violet-lt); stroke-width: 1.9;\"><circle cx=\"12\" cy=\"12\" r=\"9\"></circle><path d=\"M12 8v.01M12 11v5\"></path></svg>\n            <span style=\"font-size: 12.5px; font-weight: 700; letter-spacing: 1.4px; color: var(--violet-lt);\">IMPORTANT INFORMATION</span>\n          </div>\n          <div style=\"display: grid; gap: 18px;\">\n            <div style=\"display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 12px;\">\n              <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: var(--muted); stroke-width: 1.8; margin-top: 2px;\"><circle cx=\"9\" cy=\"9\" r=\"3\"></circle><path d=\"M3 19q6-6 12 0M16.5 7a3 3 0 010 6\"></path></svg>\n              <div>\n                <div style=\"font-size: 14.5px; font-weight: 600; margin-bottom: 5px;\">Team Formation</div>\n                <div style=\"font-size: 13.5px; line-height: 1.55; color: var(--muted);\">Teams can be formed at the venue with 2–5 members.</div>\n              </div>\n            </div>\n            <div style=\"display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 12px;\">\n              <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: var(--muted); stroke-width: 2; margin-top: 2px;\"><path d=\"M5 12.5l4 4 9-9.5\"></path></svg>\n              <div>\n                <div style=\"font-size: 14.5px; font-weight: 600; margin-bottom: 5px;\">Registration</div>\n                <div style=\"font-size: 13.5px; line-height: 1.55; color: var(--muted);\">Please ensure that the details provided during registration are correct.</div>\n              </div>\n            </div>\n            <div style=\"display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 12px;\">\n              <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: var(--muted); stroke-width: 1.8; margin-top: 2px;\"><circle cx=\"12\" cy=\"12\" r=\"9\"></circle><path d=\"M9.5 9.5a2.5 2.5 0 113 2.4v1.3M12 16.5v.01\"></path></svg>\n              <div>\n                <div style=\"font-size: 14.5px; font-weight: 600; margin-bottom: 5px;\">Need Help?</div>\n                <div style=\"font-size: 13.5px; line-height: 1.55; color: var(--muted); margin-bottom: 10px;\">For any registration issues or queries, contact:</div>\n                <div style=\"display: flex; gap: 10px 18px; flex-wrap: wrap; font-size: 13.5px; font-weight: 600; color: #6BA8F5;\">\n                  <span>+91 91214 95077</span><span style=\"color: var(--dim);\">|</span><span>+91 84669 65800</span>\n                </div>\n                <div style=\"display: flex; gap: 10px 18px; flex-wrap: wrap; font-size: 13.5px; font-weight: 600; color: #6BA8F5; margin-top: 6px;\">\n                  <span>+91 6281 083 332</span><span style=\"color: var(--dim);\">|</span><span>+91 63001 97713</span>\n                </div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <div class=\"ev-g\" style=\"display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 12px; border: 1px solid #3A2E72; border-radius: 16px; background: rgba(124,92,252,.08); padding: 18px 20px;\">\n          <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" style=\"fill: none; stroke: var(--violet-lt); stroke-width: 1.8; margin-top: 2px;\"><path d=\"M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6Z\"></path></svg>\n          <div style=\"font-size: 13.5px; line-height: 1.6; color: var(--muted);\">A <strong style=\"color: var(--text); font-weight: 600;\">free Student Alumni account</strong> will be created with this email — your login credentials will be emailed to you so you can view your tickets anytime under <span style=\"color: var(--violet-lt); font-weight: 600;\">My Tickets</span>.</div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div id=\"ev-footer-slot\"></div>\n</div>";

export default function EchoEventsLanding() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  // Theme-aware CSS variable updates for the static HTML
  useEffect(() => {
    const root = document.getElementById("ev-root");
    if (!root) return;
    const s = root.style;
    if (isDark) {
      s.setProperty("--bg", "#0A0A14");
      s.setProperty("--panel", "#11111C");
      s.setProperty("--panel2", "#161622");
      s.setProperty("--line", "#1F1F30");
      s.setProperty("--line2", "#292940");
      s.setProperty("--text", "#F4F4FA");
      s.setProperty("--muted", "#8A8A9E");
      s.setProperty("--dim", "#6A6A7E");
    } else {
      s.setProperty("--bg", "#F5F5F7");
      s.setProperty("--panel", "#FFFFFF");
      s.setProperty("--panel2", "#F0F0F5");
      s.setProperty("--line", "#E5E5EA");
      s.setProperty("--line2", "#D1D1D6");
      s.setProperty("--text", "#1D1D1F");
      s.setProperty("--muted", "#6E6E73");
      s.setProperty("--dim", "#AEAEB2");
    }
    // Also update body background
    document.body.style.background = isDark ? "#0A0A14" : "#F5F5F7";
    document.body.style.color = isDark ? "#F4F4FA" : "#1D1D1F";
  }, [isDark]);

  useEffect(() => {
    const root = document.getElementById("ev-root");
    if (!root) return;

    // Initial Curtain Countdown with 5.5s Delay and Smooth Ease
    const curtain = document.getElementById("ev-curtain");
    const countEl = document.getElementById("ev-curtain-num");
    const curtainBar = document.getElementById("ev-curtain-bar");

    if (curtain) {
      const INITIAL_DURATION = 5500;
      const startTime = performance.now();
      const runInitialCurtain = () => {
        const elapsed = performance.now() - startTime;
        const p = Math.min(1, elapsed / INITIAL_DURATION);
        const val = Math.floor(p * 100);
        if (countEl) countEl.textContent = String(val).padStart(2, "0");
        if (curtainBar) curtainBar.style.width = (p * 100).toFixed(1) + "%";

        if (p < 1) {
          requestAnimationFrame(runInitialCurtain);
        } else {
          if (countEl) countEl.textContent = "100";
          if (curtainBar) curtainBar.style.width = "100%";
          setTimeout(() => {
            curtain.style.opacity = "0";
            setTimeout(() => {
              curtain.style.display = "none";
              curtain.style.pointerEvents = "none";
            }, 450);
          }, 250);
        }
      };
      requestAnimationFrame(runInitialCurtain);
    }

    // Reusable Transition Curtain for Page/View Switching
    const triggerCurtainTransition = (label: string, onDone: () => void) => {
      if (!curtain) {
        onDone();
        return;
      }
      if (countEl) countEl.textContent = "00";
      if (curtainBar) curtainBar.style.width = "0%";
      curtain.style.display = "flex";
      curtain.style.pointerEvents = "auto";
      requestAnimationFrame(() => {
        curtain.style.opacity = "1";
      });

      const SWITCH_DURATION = 3500;
      const t0 = performance.now();
      const runSwitchCurtain = () => {
        const elapsed = performance.now() - t0;
        const p = Math.min(1, elapsed / SWITCH_DURATION);
        const val = Math.floor(p * 100);
        if (countEl) countEl.textContent = String(val).padStart(2, "0");
        if (curtainBar) curtainBar.style.width = (p * 100).toFixed(1) + "%";

        if (p < 1) {
          requestAnimationFrame(runSwitchCurtain);
        } else {
          if (countEl) countEl.textContent = "100";
          if (curtainBar) curtainBar.style.width = "100%";
          onDone();
          setTimeout(() => {
            curtain.style.opacity = "0";
            setTimeout(() => {
              curtain.style.display = "none";
              curtain.style.pointerEvents = "none";
            }, 450);
          }, 200);
        }
      };
      requestAnimationFrame(runSwitchCurtain);
    };

    // 3 Views: List, Detail, Registration
    const pages: Record<string, HTMLElement | null> = {
      list: document.getElementById("ev-page-list"),
      detail: document.getElementById("ev-page-detail"),
      reg: document.getElementById("ev-page-reg")
    };
    const cls: Record<string, string> = { list: ".ev-r", detail: ".ev-d", reg: ".ev-g" };

    const play = (key: string) => {
      const p = pages[key];
      if (!p) return;
      Array.from(p.querySelectorAll<HTMLElement>(cls[key])).forEach((el, i) => {
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "ev-in .6s cubic-bezier(.2,.8,.2,1) both " + Math.min(i * 0.07, 0.6) + "s";
      });
    };

    const go = (key: string, transition = false) => {
      const doSwitch = () => {
        Object.keys(pages).forEach((k) => {
          if (pages[k]) pages[k]!.style.display = k === key ? "block" : "none";
        });
        window.scrollTo(0, 0);
        play(key);
      };

      if (transition) {
        triggerCurtainTransition(key.toUpperCase(), doSwitch);
      } else {
        doSwitch();
      }
    };

    // View Navigation Buttons
    const openSnist = document.getElementById("ev-open-snist");
    if (openSnist) openSnist.addEventListener("click", () => go("detail", true));

    const toReg = document.getElementById("ev-to-reg");
    if (toReg) toReg.addEventListener("click", (e) => {
      e.stopPropagation();
      go("reg", true);
    });

    root.querySelectorAll<HTMLElement>(".ev-back").forEach((b) => b.addEventListener("click", () => go("list", true)));
    root.querySelectorAll<HTMLElement>(".ev-back-detail").forEach((b) => b.addEventListener("click", () => go("detail", true)));

    // View Upcoming Events handler
    root.querySelectorAll<HTMLElement>("button, .ev-btn, span").forEach((el) => {
      if (el.textContent?.trim().toLowerCase().includes("view upcoming events")) {
        el.addEventListener("click", () => {
          go("list", true);
          setTimeout(() => {
            const target = document.getElementById("ev-open-snist");
            if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 400);
        });
      }
    });

    const browseBtn = document.getElementById("ev-browse-btn");
    if (browseBtn) browseBtn.addEventListener("click", () => {
      const target = document.getElementById("ev-open-snist");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    // Top Quote Ticker: continuous scroll, pauses on hover
    const ticker = document.getElementById("ev-ticker");
    if (ticker) {
      ticker.addEventListener("mouseenter", () => { ticker.style.animationPlayState = "paused"; });
      ticker.addEventListener("mouseleave", () => { ticker.style.animationPlayState = "running"; });
    }

    // Registration Segment Pricing Switch
    const fee = document.getElementById("ev-fee");
    const payLabel = document.getElementById("ev-pay-label");
    const seats = document.getElementById("ev-seats");
    root.querySelectorAll<HTMLElement>(".ev-seg").forEach((s, i) => s.addEventListener("click", () => {
      root.querySelectorAll<HTMLElement>(".ev-seg").forEach((o) => {
        if (o === s) o.dataset.on = "1";
        else delete o.dataset.on;
      });
      const team = i === 1;
      if (fee) fee.textContent = team ? "INR 2,495" : "INR 599";
      if (payLabel) payLabel.textContent = team ? "Pay INR 2,495 via Razorpay" : "Pay INR 599 via Razorpay";
      if (seats) seats.textContent = team ? "197 team slots available" : "985 seats available";
    }));

    // Terms & Conditions gate — the pay button only enables once accepted
    const terms = document.getElementById("ev-terms");
    const termsBox = document.getElementById("ev-terms-box");
    const termsErr = document.getElementById("ev-terms-err");
    const pay = document.getElementById("ev-pay");
    const sheen = document.getElementById("ev-pay-sheen");
    let accepted = false;

    const syncPay = () => {
      if (!pay) return;
      pay.style.background = accepted ? "linear-gradient(100deg, var(--violet), #6246E8)" : "var(--line2)";
      pay.style.color = accepted ? "#FFFFFF" : "var(--dim)";
      pay.style.cursor = accepted ? "pointer" : "not-allowed";
      pay.style.boxShadow = accepted ? "0 12px 30px rgba(124,92,252,.35)" : "none";
      if (sheen) {
        sheen.style.opacity = accepted ? "1" : "0";
        sheen.style.animation = accepted ? "ev-sheen 3.4s ease-in-out infinite" : "none";
      }
      if (termsErr) termsErr.style.display = accepted ? "none" : "block";
    };

    if (terms && termsBox) terms.addEventListener("click", () => {
      accepted = !accepted;
      const tick = termsBox.querySelector<SVGElement>("svg");
      termsBox.style.background = accepted ? "var(--violet)" : "transparent";
      termsBox.style.borderColor = accepted ? "var(--violet)" : "var(--line2)";
      if (tick) tick.style.opacity = accepted ? "1" : "0";
      syncPay();
    });
    syncPay();

    // WhatsApp updates checkbox
    const wa = document.getElementById("ev-wa");
    const waBox = document.getElementById("ev-wa-box");
    let waOn = true;
    if (wa && waBox) wa.addEventListener("click", () => {
      waOn = !waOn;
      const tick = waBox.querySelector<SVGElement>("svg");
      waBox.style.background = waOn ? "var(--violet)" : "transparent";
      waBox.style.borderColor = waOn ? "var(--violet)" : "var(--line2)";
      if (tick) tick.style.opacity = waOn ? "1" : "0";
    });

    // Pay action trigger
    if (pay) {
      pay.addEventListener("click", () => {
        if (!accepted) return;
        alert("Redirecting to Razorpay Secure Payment Gateway...");
      });
    }

    // Hero "Host on your campus" button
    root.querySelectorAll<HTMLElement>("[data-nav='contact']").forEach((el) => {
      el.addEventListener("click", () => {
        triggerCurtainTransition("CONTACT US", () => router.push("/contact"));
      });
    });

    // Responsive pass
    const responsive = () => {
      const w = root.getBoundingClientRect().width;
      const narrow = w < 1180, tight = w < 860;
      root.querySelectorAll<HTMLElement>(".ev-herorow").forEach((g) => { g.style.gridTemplateColumns = narrow ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 420px)"; });
      root.querySelectorAll<HTMLElement>(".ev-herostats").forEach((g) => { g.style.gridTemplateColumns = tight ? "repeat(3, minmax(0, 1fr))" : "repeat(3, max-content)"; });
      root.querySelectorAll<HTMLElement>(".ev-grid2").forEach((g) => { g.style.gridTemplateColumns = narrow ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))"; });
      root.querySelectorAll<HTMLElement>(".ev-grid3").forEach((g) => { g.style.gridTemplateColumns = tight ? "minmax(0, 1fr)" : "repeat(3, minmax(0, 1fr))"; });
      root.querySelectorAll<HTMLElement>(".ev-grid4").forEach((g) => { g.style.gridTemplateColumns = tight ? "minmax(0, 1fr)" : narrow ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))"; });
      root.querySelectorAll<HTMLElement>(".ev-hlline").forEach((l) => { l.style.display = narrow ? "none" : "block"; });
      root.querySelectorAll<HTMLElement>(".ev-dgrid").forEach((g) => { g.style.gridTemplateColumns = narrow ? "minmax(0, 1fr)" : "minmax(0, 1fr) 420px"; });
      root.querySelectorAll<HTMLElement>(".ev-rgrid").forEach((g) => { g.style.gridTemplateColumns = narrow ? "minmax(0, 1fr)" : "minmax(0, 1fr) 560px"; });
      root.querySelectorAll<HTMLElement>(".ev-actions").forEach((g) => { g.style.gridTemplateColumns = tight ? "minmax(0, 1fr)" : "minmax(0, 1fr) max-content"; });
    };
    responsive();
    window.addEventListener("resize", responsive);

    return () => {
      window.removeEventListener("resize", responsive);
    };
  }, []);

  // ── CMS Hero Config: patch hero section from echo_settings ────────────────
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/echo/admin/settings", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const hc = data.hero_config;
        if (!hc) return;

        const root = containerRef.current;
        if (!root) return;

        // Update badge
        if (hc.badge) {
          root.querySelectorAll<HTMLElement>(".ev-r").forEach((el) => {
            const badge = el.querySelector<HTMLElement>("span");
            if (badge && badge.textContent?.trim() === "ON THE GROUND") {
              badge.textContent = badge.textContent.replace("ON THE GROUND", hc.badge);
            }
          });
        }

        // Update title
        if (hc.title) {
          root.querySelectorAll<HTMLElement>(".ev-r").forEach((el) => {
            const children = el.querySelectorAll<HTMLElement>("div");
            children.forEach((div) => {
              if (div.textContent?.trim() === "The network is a feed until it meets in person.") {
                div.textContent = hc.title;
              }
            });
          });
        }

        // Update description
        if (hc.description) {
          root.querySelectorAll<HTMLElement>(".ev-r").forEach((el) => {
            const children = el.querySelectorAll<HTMLElement>("div");
            children.forEach((div) => {
              if (div.textContent?.startsWith("Eighty-six ECHO events across thirty-one campuses.")) {
                div.textContent = hc.description;
              }
            });
          });
        }

        // Update stats
        if (hc.stats && Array.isArray(hc.stats) && hc.stats.length > 0) {
          const statsGrid = root.querySelector(".ev-herostats");
          if (statsGrid) {
            const statDivs = statsGrid.querySelectorAll<HTMLElement>(":scope > div");
            hc.stats.forEach((stat: any, i: number) => {
              if (i < statDivs.length) {
                const valueDiv = statDivs[i].querySelector<HTMLElement>("div:first-child");
                const labelDiv = statDivs[i].querySelector<HTMLElement>("div:last-child");
                if (valueDiv && stat.value) valueDiv.textContent = String(stat.value);
                if (labelDiv && stat.label) labelDiv.textContent = stat.label;
                if (valueDiv && stat.color) valueDiv.style.color = stat.color;
              }
            });
          }
        }

        // Update CTA primary button
        if (hc.cta_primary) {
          const browseBtn = document.getElementById("ev-browse-btn");
          if (browseBtn) browseBtn.textContent = hc.cta_primary;
        }

        // Update recent hosts
        if (hc.recent_hosts && Array.isArray(hc.recent_hosts) && hc.recent_hosts.length > 0) {
          const hostsContainer = root.querySelector<HTMLElement>(".ev-r:last-of-type .ev-r:last-of-type .ev-heromosaic")?.parentElement?.nextElementSibling;
          if (hostsContainer) {
            const hostsRow = hostsContainer.querySelector<HTMLElement>("div:last-child");
            if (hostsRow) {
              hostsRow.innerHTML = hc.recent_hosts.map((h: string) => 
                `<span style="font-size: 12.5px; font-weight: 600; color: #2E2A55; background: rgba(20,23,38,.05); border-radius: 100px; padding: 7px 14px;">${h}</span>`
              ).join("");
            }
          }
        }

        // Update section header
        if (hc.section_title) {
          const sections = root.querySelectorAll<HTMLElement>(".ev-r");
          sections.forEach((sec) => {
            const h2 = sec.querySelector<HTMLElement>("div:nth-child(2)");
            if (h2 && h2.textContent?.trim() === "Explore ECHO Events by College") {
              h2.textContent = hc.section_title;
            }
          });
        }
        if (hc.section_description) {
          const sections = root.querySelectorAll<HTMLElement>(".ev-r");
          sections.forEach((sec) => {
            const p = sec.querySelector<HTMLElement>("div:nth-child(3)");
            if (p && p.textContent?.startsWith("Image galleries, partners, sponsors")) {
              p.textContent = hc.section_description;
            }
          });
        }
      })
      .catch(() => {}); // silent fail — page shows hardcoded defaults
    return () => controller.abort();
  }, []);

  const navSlot = typeof document !== "undefined" ? document.getElementById("ev-nav-slot") : null;
  const footerSlot = typeof document !== "undefined" ? document.getElementById("ev-footer-slot") : null;

  return (
    <>
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: ECHO_SPEC_HTML }}
        style={{ width: "100%", minHeight: "100vh", height: "auto", background: "#0A0A14", overflowY: "visible" }}
      />
      {navSlot && createPortal(
        <Navbar activeTab="echo" onTabChange={(tab) => {
          if (tab === "home") router.push("/");
          else if (tab === "echo") router.push("/echo");
          else if (tab === "verify") router.push("/verify");
          else if (tab === "contact") router.push("/contact");
        }} />,
        navSlot
      )}
      {footerSlot && createPortal(
        <CommonFooter onTabChange={(tab) => {
          if (tab === "home") router.push("/");
          else if (tab === "echo") router.push("/echo");
          else if (tab === "verify") router.push("/verify");
          else if (tab === "contact") router.push("/contact");
        }} />,
        footerSlot
      )}
    </>
  );
}
