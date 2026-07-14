// src/components/OnlineDot.jsx
// Feature 4.3 — A small presence dot used everywhere a user is displayed.
// Green + pulsing = online. Grey = offline.
//
// Props:
//   online  {boolean}   — is this user currently online?
//   size    {number}    — dot diameter in px (default 8)
//   pulse   {boolean}   — animate the green dot (default true)
//   style   {object}    — additional style overrides

export default function OnlineDot({ online, size = 8, pulse = true, style = {} }) {
  return (
    <span
      title={online ? 'Online' : 'Offline'}
      style={{
        display: 'inline-block',
        width:  size,
        height: size,
        borderRadius: '50%',
        background: online ? '#5FA021' : '#D0CDD7',
        flexShrink: 0,
        boxShadow: online ? `0 0 0 0 rgba(95,160,33,.6)` : 'none',
        animation: online && pulse ? 'tc-online-pulse 2s infinite' : 'none',
        ...style,
      }}
    >
      <style>{`
        @keyframes tc-online-pulse {
          0%   { box-shadow: 0 0 0 0   rgba(95,160,33,.6); }
          70%  { box-shadow: 0 0 0 5px rgba(95,160,33,0);  }
          100% { box-shadow: 0 0 0 0   rgba(95,160,33,0);  }
        }
      `}</style>
    </span>
  );
}