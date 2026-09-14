import { useState } from 'react';
import ReactMarkdown from "react-markdown";

export default function QuizClassification({ questions, title = "Quiz de classification" }) {
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct) {
        correct++;
      }
    });
    setScore(correct);
    setShowResults(true);
  };

  const handleReset = () => {
    setAnswers({});
    setShowResults(false);
    setScore(0);
  };

  const getButtonStyle = (questionId, option) => {
    if (!showResults) {
      return answers[questionId] === option ? styles.selected : styles.option;
    }

    const question = questions.find(q => q.id === questionId);
    const isCorrect = option === question.correct;
    const isSelected = answers[questionId] === option;

    if (isCorrect) return styles.correct;
    if (isSelected && !isCorrect) return styles.incorrect;
    return styles.disabled;
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>
        <span style={styles.emoji}>🎯</span>
        {title}
      </h3>

      {questions.map((question, idx) => (
        <div key={question.id} style={styles.questionBlock}>
          <div style={styles.questionText}>
            <span style={styles.questionNumber}>{idx + 1}</span>
            <span className='markdown-wrapper'>
              <ReactMarkdown>{question.question}</ReactMarkdown>
            </span>

          </div>

          <div style={styles.optionsGrid}>
            {question.options.map(option => (
              <button
                key={option}
                onClick={() => !showResults && handleAnswer(question.id, option)}
                disabled={showResults}
                style={{
                  ...styles.button,
                  ...getButtonStyle(question.id, option),
                  cursor: showResults ? 'default' : 'pointer'
                }}
              >
                {option}
              </button>
            ))}
          </div>

          {showResults && (
            <div style={
              answers[question.id] === question.correct 
                ? styles.feedbackCorrect 
                : styles.feedbackIncorrect
            }>
              <p style={styles.feedbackTitle}>
                {answers[question.id] === question.correct ? (
                  <><span>✅</span> Bonne réponse!</>
                ) : (
                  <><span>❌</span> Réponse incorrecte</>
                )}
              </p>
              <p style={styles.explanation}>
                <ReactMarkdown>{question.explanation}</ReactMarkdown>
              </p>
            </div>
          )}
        </div>
      ))}

      <div style={styles.footer}>
        {!showResults ? (
          <button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length !== questions.length}
            style={{
              ...styles.submitButton,
              opacity: Object.keys(answers).length !== questions.length ? 0.5 : 1,
              cursor: Object.keys(answers).length !== questions.length ? 'not-allowed' : 'pointer'
            }}
          >
            Soumettre les réponses
          </button>
        ) : (
          <>
            <div style={styles.scoreBox}>
              <p style={styles.scoreText}>
                Résultat: {score} / {questions.length}
              </p>
              <p style={styles.scoreSubtext}>
                {score === questions.length
                  ? 'Parfait! Vous maîtrisez la classification!'
                  : score >= questions.length * 0.7
                  ? 'Bon travail! Quelques révisions à faire.'
                  : 'Continue à pratiquer, tu vas y arriver!'}
              </p>
            </div>
            <button onClick={handleReset} style={styles.resetButton}>
              Recommencer
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    margin: '2rem 0',
    padding: '1.5rem',
    background: 'linear-gradient(to bottom right, #f8fafc, #eff6ff)',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e2e8f0'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  emoji: {
    fontSize: '1.875rem'
  },
  questionBlock: {
    marginBottom: '1.5rem',
    padding: '1.25rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #f1f5f9'
  },
  questionText: {
    fontWeight: '600',
    marginBottom: '1rem',
    color: '#334155',
    fontSize: '1.125rem',
    lineHeight: '1.6'
  },
  questionNumber: {
    display: 'inline-block',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '50%',
    width: '1.75rem',
    height: '1.75rem',
    textAlign: 'center',
    lineHeight: '1.75rem',
    marginRight: '0.5rem',
    fontSize: '0.875rem'
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '0.5rem'
  },
  button: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontWeight: '500',
    textAlign: 'left',
    border: '2px solid transparent',
    transition: 'all 0.2s',
    fontSize: '1rem'
  },
  option: {
    backgroundColor: '#f1f5f9',
    color: '#1e293b',
    border: '2px solid #e2e8f0'
  },
  selected: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: '2px solid #2563eb'
  },
  correct: {
    backgroundColor: '#10b981',
    color: 'white',
    border: '2px solid #059669'
  },
  incorrect: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: '2px solid #dc2626'
  },
  disabled: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8'
  },
  feedbackCorrect: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#d1fae5',
    borderLeft: '4px solid #10b981',
    borderRadius: '8px'
  },
  feedbackIncorrect: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#fee2e2',
    borderLeft: '4px solid #ef4444',
    borderRadius: '8px'
  },
  feedbackTitle: {
    fontWeight: '600',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  explanation: {
    fontSize: '0.875rem',
    color: '#334155',
    margin: 0,
    lineHeight: '1.5'
  },
  footer: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
    flexWrap: 'wrap'
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    fontWeight: '600',
    borderRadius: '8px',
    border: 'none',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s',
    fontSize: '1rem'
  },
  scoreBox: {
    flex: 1,
    padding: '1rem',
    background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
    color: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  },
  scoreText: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    margin: '0 0 0.25rem 0'
  },
  scoreSubtext: {
    fontSize: '0.875rem',
    opacity: 0.9,
    margin: 0
  },
  resetButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#64748b',
    color: 'white',
    fontWeight: '600',
    borderRadius: '8px',
    border: 'none',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '1rem'
  }
};
