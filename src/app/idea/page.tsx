"use client";

import { useState } from "react";

const ideas = [
  {
    id: 1,
    category: "Arts de la scène",
    title: "StageCue — The Interactive Digital Prompt Book",
    emoji: "🎭",
    color: "#E63946",
    painPoint: {
      title: "Stage managers still build prompt books by hand on paper or cobble together generic apps",
      description:
        "Stage managers — the backbone of every theater production — still record blocking notation, lighting/sound cues, and rehearsal notes using pencil-on-paper prompt books, or hacked-together workflows across PDF annotators (Notability), dance-notation apps (Stagewright), and generic note-taking software. There is no single purpose-built, affordable digital prompt book that combines script annotation, visual blocking on a stage map, and cue tracking. Existing solutions like ProductionPro are focused on script distribution, not stage management workflow. Others like UrbanByte's Que-It are iPad-only and limited. Forum posts on ControlBooth and Reddit repeatedly express frustration: 'I feel that there could be a better solution specifically for stage managers' and 'it would be nice for there to be a specific app that allows someone to have an easy to manage script during a performance.' The prompt book is called the 'show bible' — and it's still being built with binders and pencils in 2026.",
    },
    targetAudience:
      "Stage managers at small-to-mid-size theater companies, community theaters, university theater departments, and fringe/indie productions. These are typically underfunded, often volunteer or early-career professionals, managing 1–3 shows at a time. They value reliability over flashiness. Secondary audience: directors and assistant stage managers who collaborate on blocking.",
    toolIdea:
      "A web app (mobile-responsive, works on tablets) where stage managers can upload a script (PDF or text), annotate it with blocking shorthand (drag actors on a configurable 2D stage map that snaps to standard stage zones: USR, DSL, etc.), log lighting/sound/fly cues with standard color-coded notation, and generate nightly rehearsal reports from a template. Key feature: the stage map is linked to lines in the script — tap a line, see where everyone should be. Export to PDF for the paper-backup crowd. Free tier with 1 active show, paid tier at ~$5/month.",
    howItSolves: {
      demo: "Live demo: load a real short script (a public-domain one-act), show blocking being recorded in real-time on the stage map as you step through the script. Trigger a few cues. Then export the prompt book as a clean PDF. Side-by-side comparison: show the paper version vs. the digital version — speed, searchability, and collaboration.",
      metrics:
        "Time saved per rehearsal logging blocking (aim for 40–60% reduction vs. paper). Number of cue errors caught by the system's validation (e.g., warning if two cues overlap). User feedback from 2–3 real stage managers you recruit to test during the week.",
      validation:
        "Reach out to 3–5 local theater stage managers (Montréal has a rich theater scene — try Centaur Theatre, Théâtre du Nouveau Monde contacts, or university programs). Ask them to test for 1 rehearsal and give a 5-minute video testimonial.",
    },
    pitchingTips: [
      "Open with: 'The prompt book hasn't changed in 100 years. We digitized it without losing what makes it sacred.' — this frames respect for the craft, which theater judges care about deeply.",
      "Show the paper-to-digital side-by-side. Judges from theaters will immediately recognize the binder, the pencil marks, the chaos. Then show the clean digital version. The contrast sells itself.",
      "Emphasize that this is NOT a production management or logistics tool — it's a creative/performance tool for the person running the show in real-time. This avoids the hackathon restriction.",
      "Name-drop the stage management workflow: 'standby... go.' Show that you understand their world. Theater judges will trust you more if you speak their language.",
      "End with a quote from a real stage manager who tested it: nothing beats social proof from their own community.",
    ],
    techStack: "React + Canvas/SVG for stage map, PDF.js for script import, localStorage or lightweight DB, PDF export via jsPDF",
    difficulty: "Medium-High — the stage map interactivity and script-annotation sync are the technical challenges",
    originality: "No widely-adopted free/open digital prompt book exists. ProductionPro focuses on script distribution. Que-It is limited and iPad-only. This fills a genuine gap."
  },
  {
    id: 2,
    category: "Arts sonores",
    title: "SoundSpace — Spatial Audio Previewer for Small Venues",
    emoji: "🔊",
    color: "#457B9D",
    painPoint: {
      title: "Sound designers for small theaters can't preview how spatial audio will feel in the room before tech week",
      description:
        "Spatial and immersive audio is one of the biggest trends in live performance in 2025–2026. Tools like L-Acoustics L-ISA, Meyer Sound Spacemap, and Dolby Atmos are transforming large-venue sound design. But these tools cost tens of thousands of dollars and require specialized hardware. Small theater companies, indie performance groups, and sound art installers have no way to prototype or preview how a multi-speaker spatial sound design will sound in their specific room before physically setting up. They arrive at tech week, hang speakers, and hope for the best. Sound bleeding between scenes, poor coverage zones, and mismatched spatial effects are common complaints. Industry sources note that 'integrating audio systems with interactive projections poses challenges such as synchronization, scalability, and cost.' For small venues, even basic spatial design — like making a sound travel from stage-left to audience-right — requires expensive tools or blind guesswork.",
    },
    targetAudience:
      "Sound designers at small-to-mid-size theaters (under 200 seats), independent immersive theater companies, sound art students and emerging sound artists creating installations, and fringe festival productions. Also: theater technical directors who handle sound duties in addition to other roles.",
    toolIdea:
      "A browser-based spatial audio simulator. The user defines their room dimensions and speaker positions (drag-and-drop on a 2D floor plan), uploads audio clips, and assigns them to speakers with timing/panning curves. The tool then renders a binaural (headphone) preview of what the audience would hear from any seat in the room using Web Audio API's spatialization. Key feature: click anywhere on the floor plan to 'sit' in that seat and hear the spatial mix from that perspective. Export the speaker routing as a simple channel-map document the sound tech can use during load-in. No hardware required — just headphones and a browser.",
    howItSolves: {
      demo: "Live demo: model a small black-box theater (say, 50 seats). Place 4–6 speakers. Play a thunderstorm sound design where rain pans across the room and a thunder crack comes from behind the audience. Click on different seats to show how the experience changes spatially. Then show the exported channel map.",
      metrics:
        "A/B test: have a sound designer create a spatial design blindly vs. using the tool, then compare how close the result matches their intent when played back on real speakers. Survey sound designers on confidence level before vs. after using the previewer.",
      validation:
        "Partner with a local theater's sound designer for their current production. Have them model their venue and preview their design in the tool before tech. Compare their experience to previous shows done without it.",
    },
    pitchingTips: [
      "Open the pitch BY PLAYING SOUND. Put headphones on the judges (or use a good speaker setup) and let them hear the difference between flat stereo and the spatial preview. Sensory experience beats slides every time.",
      "Frame it as democratizing: 'L-Acoustics L-ISA costs $XX,000. This gives any small theater the same spatial preview capability in a browser for free.'",
      "Connect to the hackathon's 'Arts sonores' sub-theme explicitly. This is a pure sound-art tool with a clear technical challenge (real-time binaural rendering).",
      "Show the floor-plan-to-ears pipeline: 'Design in 2D, hear in 3D.' This is a clean, memorable tagline.",
      "Emphasize the technical challenge: real-time HRTF-based binaural rendering in the browser using Web Audio API is genuinely hard and impressive.",
    ],
    techStack: "Web Audio API (PannerNode, HRTF), React or vanilla JS, Canvas/SVG for room editor, simple geometry for distance/angle calculations",
    difficulty: "High — binaural spatialization math and real-time audio rendering are the core technical challenge",
    originality: "Commercial spatial audio previewers exist (L-ISA Studio, Spacemap Go) but they're expensive, proprietary, and tied to specific hardware ecosystems. No free browser-based tool exists for small venues."
  },
  {
    id: 3,
    category: "Arts visuels",
    title: "OpenWall — Collaborative Exhibition Builder for Independent Artists",
    emoji: "🖼️",
    color: "#2A9D8F",
    painPoint: {
      title: "Independent visual artists can't easily co-curate group exhibitions or visualize how their work fits a physical gallery space",
      description:
        "Independent and emerging visual artists in 2025–2026 face a brutal visibility problem. Platforms like Behance and Instagram are saturated. But the deeper, more practical frustration is around physical exhibitions — the thing that still drives sales, press, and career advancement. Group shows are how emerging artists get gallery exposure, but organizing one is a nightmare of coordination: who brings what piece, what dimensions fit the wall, how does the flow work, who handles the invitation/catalog? Artists report spending more energy on logistics than on art. Meanwhile, galleries and artist-run spaces struggle to fill programming because organizing group shows is so labor-intensive. Forum discussions and artist newsletters repeatedly surface the same complaints: 'every creative I talk to is having a tough year,' 'money is tight,' and the sense that discovery and showing opportunities are shrinking. The infrastructure for self-organized, artist-led exhibitions barely exists beyond group chats and shared Google Docs.",
    },
    targetAudience:
      "Emerging and mid-career visual artists (painters, sculptors, photographers, mixed-media) who participate in group exhibitions at artist-run centers, pop-up galleries, community art spaces, and open-studio events. Secondary: small gallery curators and art collectives looking for tools to streamline group show curation. In Montréal specifically: the Belgo Building artists, Mile End studio collectives, artist-run centers like Articule or CLARK.",
    toolIdea:
      "A web app where artists and curators collaboratively plan a group exhibition. Create a 'show' with a venue floor plan (upload an image or draw walls). Invited artists upload images of their works with dimensions. Drag-and-drop pieces onto the virtual walls to curate the layout. See a simple 3D walkthrough preview of the exhibition (think: Google Street View but for your gallery). Auto-generate a digital catalog/lookbook (artist names, titles, dimensions, statements) as a shareable link or PDF. Built-in RSVP page for the opening. Free for up to 10 artists per show.",
    howItSolves: {
      demo: "Live demo: create a show called 'Hackathon Group Show.' Upload a simple floor plan. Add 4–5 artworks (use public-domain paintings for demo). Drag them onto walls, resize to scale. Switch to the 3D walkthrough view and walk through the virtual gallery. Generate the catalog PDF in one click. Show the shareable invitation page.",
      metrics:
        "Time to plan a group exhibition layout: measure hours saved vs. the current process (in-person meetings + measurement tape + spreadsheets). Number of shows organized through the platform in a pilot period. Artist satisfaction survey after using it for one real show.",
      validation:
        "Reach out to an artist-run center in Montréal (Articule, CLARK, or Eastern Bloc) and offer to pilot the tool for their next group show call. Get feedback from both the curator and the participating artists.",
    },
    pitchingTips: [
      "Start with the human story: 'Five artists want to show together. Right now, that means 47 WhatsApp messages, a tape measure, and someone's boyfriend holding paintings against walls while someone else takes photos. We built something better.'",
      "Show the 3D walkthrough. This is your wow moment — seeing a virtual gallery populated with real art is visceral and immediately understood by art-world judges.",
      "Frame it as empowering artists, not replacing galleries. 'This doesn't replace the curator — it gives the curator superpowers.' Judges from the art world will be sensitive to the distinction.",
      "The auto-generated catalog is your 'one more thing' moment. Art people love catalogs. Generating one in seconds from the same data they already entered is genuinely useful.",
      "Connect to Montréal's art ecosystem specifically. If judges are local, mentioning Belgo, Mile End, or specific artist-run centers shows you understand the community.",
    ],
    techStack: "React + Three.js (or simple CSS 3D transforms) for walkthrough, Canvas/SVG for 2D layout, jsPDF for catalog generation, Supabase or Firebase for collaboration",
    difficulty: "Medium — the 3D walkthrough is the hardest part but can be simplified to a first-person CSS perspective with positioned images on planes",
    originality: "Tools like Kunstmatrix and Artsteps exist for virtual exhibitions, but they focus on virtual-only shows (NFT galleries, online viewing rooms). None focus on the planning workflow for physical group exhibitions with collaboration, auto-catalogs, and venue-specific floor plans."
  },
];

export default function HackathonResearch() {
  const [activeIdea, setActiveIdea] = useState(0);
  const [activeTab, setActiveTab] = useState("pain");

  const idea = ideas[activeIdea];

  const tabs = [
    { key: "pain", label: "Pain Point" },
    { key: "audience", label: "Audience" },
    { key: "tool", label: "Tool Idea" },
    { key: "solve", label: "How to Prove It" },
    { key: "pitch", label: "Pitch Tips" },
  ];

  return (
    <div style={{
      fontFamily: "'Instrument Serif', 'Georgia', serif",
      minHeight: "100vh",
      background: "#0A0A0A",
      color: "#E8E4DF",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        padding: "40px 24px 24px",
        borderBottom: "1px solid #222",
      }}>
        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "11px",
          letterSpacing: "3px",
          textTransform: "uppercase",
          color: "#666",
          margin: "0 0 8px",
        }}>
          Hackathon Market Research — Les Arts
        </p>
        <h1 style={{
          fontSize: "clamp(28px, 5vw, 42px)",
          fontWeight: 400,
          margin: "0 0 8px",
          lineHeight: 1.15,
          color: "#F5F0EB",
        }}>
          3 Winning Ideas for First Place
        </h1>
        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "12px",
          color: "#888",
          margin: 0,
        }}>
          Solo dev · 1 week · {"<"}$200/mo infra · No AI art · Original projects only
        </p>
      </div>

      {/* Idea Selector */}
      <div style={{
        display: "flex",
        gap: "0",
        borderBottom: "1px solid #222",
      }}>
        {ideas.map((item, i) => (
          <button
            key={item.id}
            onClick={() => { setActiveIdea(i); setActiveTab("pain"); }}
            style={{
              flex: 1,
              padding: "20px 12px",
              background: activeIdea === i ? "#151515" : "transparent",
              border: "none",
              borderBottom: activeIdea === i ? `2px solid ${item.color}` : "2px solid transparent",
              color: activeIdea === i ? item.color : "#666",
              cursor: "pointer",
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: "20px", display: "block", marginBottom: "6px" }}>{item.emoji}</span>
            {item.category}
          </button>
        ))}
      </div>

      {/* Idea Title */}
      <div style={{
        padding: "32px 24px 0",
      }}>
        <div style={{
          display: "flex",
          alignItems: "baseline",
          gap: "12px",
          marginBottom: "4px",
        }}>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "13px",
            color: idea.color,
            fontWeight: 600,
          }}>
            #{idea.id}
          </span>
          <h2 style={{
            fontSize: "clamp(22px, 4vw, 32px)",
            fontWeight: 400,
            margin: 0,
            color: "#F5F0EB",
          }}>
            {idea.title}
          </h2>
        </div>
        <div style={{
          display: "flex",
          gap: "16px",
          marginTop: "12px",
          fontFamily: "'DM Mono', monospace",
          fontSize: "11px",
          color: "#666",
        }}>
          <span>⚙️ {idea.difficulty}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: "0",
        padding: "24px 24px 0",
        overflowX: "auto",
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 16px",
              background: activeTab === tab.key ? "#1A1A1A" : "transparent",
              border: activeTab === tab.key ? "1px solid #333" : "1px solid transparent",
              borderBottom: activeTab === tab.key ? "1px solid #1A1A1A" : "1px solid #333",
              borderRadius: "6px 6px 0 0",
              color: activeTab === tab.key ? "#F5F0EB" : "#666",
              cursor: "pointer",
              fontFamily: "'DM Mono', monospace",
              fontSize: "12px",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        margin: "0 24px 32px",
        padding: "24px",
        background: "#1A1A1A",
        border: "1px solid #333",
        borderTop: "none",
        borderRadius: "0 6px 6px 6px",
        minHeight: "300px",
      }}>
        {activeTab === "pain" && (
          <div>
            <h3 style={{
              fontSize: "18px",
              fontWeight: 400,
              color: idea.color,
              margin: "0 0 16px",
              lineHeight: 1.4,
            }}>
              {idea.painPoint.title}
            </h3>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              lineHeight: 1.75,
              color: "#BBB",
              margin: 0,
            }}>
              {idea.painPoint.description}
            </p>
          </div>
        )}

        {activeTab === "audience" && (
          <div>
            <h3 style={{
              fontSize: "16px",
              fontWeight: 400,
              color: idea.color,
              margin: "0 0 16px",
            }}>
              Who exactly has this problem?
            </h3>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              lineHeight: 1.75,
              color: "#BBB",
              margin: 0,
            }}>
              {idea.targetAudience}
            </p>
          </div>
        )}

        {activeTab === "tool" && (
          <div>
            <h3 style={{
              fontSize: "16px",
              fontWeight: 400,
              color: idea.color,
              margin: "0 0 16px",
            }}>
              What to build (MVP scope for 1 week)
            </h3>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              lineHeight: 1.75,
              color: "#BBB",
              margin: "0 0 20px",
            }}>
              {idea.toolIdea}
            </p>
            <div style={{
              padding: "16px",
              background: "#111",
              borderRadius: "8px",
              border: "1px solid #2A2A2A",
            }}>
              <p style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                color: "#888",
                margin: "0 0 6px",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}>Tech Stack</p>
              <p style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "13px",
                color: "#CCC",
                margin: "0 0 12px",
              }}>
                {idea.techStack}
              </p>
              <p style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                color: "#888",
                margin: "0 0 6px",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}>Originality Check</p>
              <p style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "13px",
                color: "#CCC",
                margin: 0,
              }}>
                {idea.originality}
              </p>
            </div>
          </div>
        )}

        {activeTab === "solve" && (
          <div>
            <h3 style={{
              fontSize: "16px",
              fontWeight: 400,
              color: idea.color,
              margin: "0 0 16px",
            }}>
              How to demonstrate the problem is solved
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { label: "Live Demo Strategy", content: idea.howItSolves.demo },
                { label: "Metrics to Track", content: idea.howItSolves.metrics },
                { label: "Real-World Validation", content: idea.howItSolves.validation },
              ].map((block) => (
                <div key={block.label} style={{
                  padding: "16px",
                  background: "#111",
                  borderRadius: "8px",
                  border: "1px solid #2A2A2A",
                }}>
                  <p style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "11px",
                    color: idea.color,
                    margin: "0 0 8px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}>{block.label}</p>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    lineHeight: 1.7,
                    color: "#BBB",
                    margin: 0,
                  }}>{block.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "pitch" && (
          <div>
            <h3 style={{
              fontSize: "16px",
              fontWeight: 400,
              color: idea.color,
              margin: "0 0 20px",
            }}>
              How to win the room
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {idea.pitchingTips.map((tip, i) => (
                <div key={i} style={{
                  display: "flex",
                  gap: "14px",
                  padding: "14px 16px",
                  background: "#111",
                  borderRadius: "8px",
                  border: "1px solid #2A2A2A",
                  alignItems: "flex-start",
                }}>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "14px",
                    color: idea.color,
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: "1px",
                  }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    lineHeight: 1.7,
                    color: "#BBB",
                    margin: 0,
                  }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* My Recommendation */}
      <div style={{
        margin: "0 24px 40px",
        padding: "24px",
        background: "linear-gradient(135deg, #1a1510 0%, #151515 100%)",
        border: "1px solid #3A3020",
        borderRadius: "8px",
      }}>
        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "11px",
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: "#C4A44A",
          margin: "0 0 12px",
        }}>
          ★ My Recommendation
        </p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "14px",
          lineHeight: 1.75,
          color: "#CCC",
          margin: 0,
        }}>
          <strong style={{ color: "#F5F0EB" }}>Go with Idea #1 (StageCue)</strong> if you want the highest chance of winning. Here's why: judges from theaters will <em>immediately</em> recognize the problem — every stage manager they've worked with uses paper binders. The demo is tangible and self-explanatory. The technical challenge (script-linked interactive stage map) is real but achievable in a week. And critically, it's the idea that most directly serves the people <em>in the room</em> judging you. They've lived this pain. That emotional recognition is your biggest unfair advantage.
          {" "}<strong style={{ color: "#F5F0EB" }}>Idea #2 (SoundSpace)</strong> is the most technically impressive and fits "Arts sonores" perfectly — pick this if you want to wow with a live audio demo. <strong style={{ color: "#F5F0EB" }}>Idea #3 (OpenWall)</strong> has the broadest appeal and the most visual "wow moment" (3D gallery walkthrough), but the competition landscape (Artsteps, Kunstmatrix) means you'd need to clearly differentiate on the collaborative-planning angle.
        </p>
      </div>
    </div>
  );
}