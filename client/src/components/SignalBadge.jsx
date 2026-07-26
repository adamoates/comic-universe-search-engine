const SIGNAL_CONFIG = {
  firstAppearance: { label: "FIRST APPEARANCE", className: "signal-first-appearance" },
  keyCreator: { label: "KEY CREATOR", className: "signal-key-creator" },
  movieSpec: { label: "MOVIE SPEC", className: "signal-movie-spec" },
  deathIssue: { label: "DEATH ISSUE", className: "signal-death" },
  issueOne: { label: "#1 ISSUE", className: "signal-issue-one" },
  storyArc: { label: "ARC START", className: "signal-story-arc" },
};

function SignalBadge({ type, detail }) {
  const config = SIGNAL_CONFIG[type];
  if (!config) return null;

  return (
    <span className={`signal-badge ${config.className}`} title={detail || ""}>
      {config.label}
    </span>
  );
}

export default SignalBadge;
