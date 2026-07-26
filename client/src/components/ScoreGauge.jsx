function ScoreGauge({ score }) {
  let colorClass = "score-none";
  if (score >= 50) colorClass = "score-high";
  else if (score >= 25) colorClass = "score-medium";
  else if (score >= 10) colorClass = "score-low";

  return (
    <div className={`score-gauge ${colorClass}`}>
      <span className="score-value">{score}</span>
    </div>
  );
}

export default ScoreGauge;
