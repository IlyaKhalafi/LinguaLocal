"use client";
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return <html lang="en"><body style={{fontFamily:"Arial, sans-serif",padding:40,background:"#f8f9f7",color:"#243f36"}}><h1>Let’s try that again.</h1><p>The learning space could not load. Ask your school to check the server’s content and settings files.</p><button onClick={reset} style={{padding:"12px 20px",cursor:"pointer"}}>Try again</button></body></html>;
}
