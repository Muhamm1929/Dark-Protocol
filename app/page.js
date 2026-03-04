'use client';

import { useEffect, useMemo, useState } from 'react';

const defaultConfig = {
  level1: {
    name: 'ACCESS CODE',
    description: 'Показывается строка с зашифрованными буквами, где каждая буква сдвинута на +1.',
    encodedText: 'QBTTXPSE',
    answer: 'PASSWORD'
  },
  level2: {
    name: 'SYSTEM TRACE',
    description: 'Собери буквы из строк key fragment.',
    logText: `[SYS LOG]\nconnection established\nnode: 192\npacket: 845\nkey fragment: R\ntransfer: 332\nkey fragment: O\nbuffer: 114\nkey fragment: B\nsecurity: 552\nkey fragment: O\nterminal: 002\nkey fragment: T`,
    answer: 'ROBOT'
  },
  level3: {
    name: 'Secret Access (final round)',
    description: 'Угадай пароль из 4 символов. Только цифры. Несколько попыток.',
    password: '1234',
    attempts: 5,
    hint: 'Пароль состоит из 4 символов и использует только цифры.'
  }
};

const storageKey = 'darkProtocolConfig';

function normalize(value) {
  return value.trim().toUpperCase();
}

function extractFragments(logText) {
  return logText
    .split('\n')
    .map((line) => line.match(/key fragment\s*:\s*(.+)/i)?.[1]?.trim() ?? '')
    .filter(Boolean)
    .join('');
}

export default function Home() {
  const [mode, setMode] = useState('game');
  const [config, setConfig] = useState(defaultConfig);
  const [answers, setAnswers] = useState({ level1: '', level2: '', level3: '' });
  const [results, setResults] = useState({ level1: '', level2: '', level3: '' });
  const [attemptsLeft, setAttemptsLeft] = useState(defaultConfig.level3.attempts);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setConfig({
        level1: { ...defaultConfig.level1, ...parsed.level1 },
        level2: { ...defaultConfig.level2, ...parsed.level2 },
        level3: { ...defaultConfig.level3, ...parsed.level3 }
      });
      setAttemptsLeft(parsed.level3?.attempts || defaultConfig.level3.attempts);
    } catch {
      setConfig(defaultConfig);
    }
  }, []);

  useEffect(() => {
    setAttemptsLeft(config.level3.attempts);
  }, [config.level3.attempts]);

  const level2AutoAnswer = useMemo(() => extractFragments(config.level2.logText), [config.level2.logText]);

  const handleCheck = (level) => {
    if (level === 'level3') {
      if (attemptsLeft <= 0) {
        setResults((prev) => ({ ...prev, level3: 'Попытки закончились. Сбрось раунд или измени пароль в админ-панели.' }));
        return;
      }

      const isCorrect = answers.level3.trim() === config.level3.password.trim();
      if (isCorrect) {
        setResults((prev) => ({ ...prev, level3: '✅ Доступ получен.' }));
      } else {
        const next = attemptsLeft - 1;
        setAttemptsLeft(next);
        setResults((prev) => ({
          ...prev,
          level3: next > 0 ? `❌ Неверно. Осталось попыток: ${next}` : '⛔ Попытки закончились.'
        }));
      }
      return;
    }

    const expected = normalize(config[level].answer);
    const userAnswer = normalize(answers[level]);
    const passed = userAnswer === expected;

    setResults((prev) => ({
      ...prev,
      [level]: passed ? '✅ Верно' : '❌ Неверный ответ'
    }));
  };

  const handleSaveConfig = () => {
    localStorage.setItem(storageKey, JSON.stringify(config));
    setAttemptsLeft(config.level3.attempts);
    setResults({ level1: '', level2: '', level3: '' });
  };

  const resetDefaults = () => {
    setConfig(defaultConfig);
    localStorage.setItem(storageKey, JSON.stringify(defaultConfig));
    setAttemptsLeft(defaultConfig.level3.attempts);
  };

  const resetFinalRound = () => {
    setAttemptsLeft(config.level3.attempts);
    setResults((prev) => ({ ...prev, level3: '' }));
    setAnswers((prev) => ({ ...prev, level3: '' }));
  };

  return (
    <main className="page">
      <header className="header">
        <h1>Dark Protocol</h1>
        <div className="tabs">
          <button className={mode === 'game' ? 'active' : ''} onClick={() => setMode('game')}>
            Испытания
          </button>
          <button className={mode === 'admin' ? 'active' : ''} onClick={() => setMode('admin')}>
            Админ-панель
          </button>
        </div>
      </header>

      {mode === 'game' ? (
        <section className="levels">
          <LevelCard
            color="green"
            title={`🟢 Уровень 1 — Лёгкий | ${config.level1.name}`}
            description={config.level1.description}
            terminalText={config.level1.encodedText}
            answer={answers.level1}
            onAnswerChange={(v) => setAnswers((p) => ({ ...p, level1: v }))}
            onCheck={() => handleCheck('level1')}
            result={results.level1}
          />

          <LevelCard
            color="yellow"
            title={`🟡 Уровень 2 — Средний | ${config.level2.name}`}
            description={config.level2.description}
            terminalText={config.level2.logText}
            answer={answers.level2}
            onAnswerChange={(v) => setAnswers((p) => ({ ...p, level2: v }))}
            onCheck={() => handleCheck('level2')}
            result={results.level2}
            helper={`Собрано из key fragment: ${level2AutoAnswer}`}
          />

          <LevelCard
            color="red"
            title={`🔴 Уровень 3 — Сложный | ${config.level3.name}`}
            description={`${config.level3.description}\n${config.level3.hint}`}
            terminalText={`[FINAL ROUND]\nОсталось попыток: ${attemptsLeft}`}
            answer={answers.level3}
            onAnswerChange={(v) => setAnswers((p) => ({ ...p, level3: v }))}
            onCheck={() => handleCheck('level3')}
            result={results.level3}
            actions={<button onClick={resetFinalRound}>Сбросить раунд</button>}
          />
        </section>
      ) : (
        <section className="admin card">
          <h2>Админ-панель</h2>
          <p>Меняй названия, шифры, пароли и количество попыток. Изменения сохраняются в браузере.</p>

          <Editor title="Уровень 1" fields={[
            ['Название', config.level1.name, (v) => setConfig((p) => ({ ...p, level1: { ...p.level1, name: v } }))],
            ['Описание', config.level1.description, (v) => setConfig((p) => ({ ...p, level1: { ...p.level1, description: v } }))],
            ['Зашифрованная строка', config.level1.encodedText, (v) => setConfig((p) => ({ ...p, level1: { ...p.level1, encodedText: v } }))],
            ['Правильный ответ', config.level1.answer, (v) => setConfig((p) => ({ ...p, level1: { ...p.level1, answer: v } }))]
          ]} />

          <Editor title="Уровень 2" fields={[
            ['Название', config.level2.name, (v) => setConfig((p) => ({ ...p, level2: { ...p.level2, name: v } }))],
            ['Описание', config.level2.description, (v) => setConfig((p) => ({ ...p, level2: { ...p.level2, description: v } }))],
            ['Лог системы', config.level2.logText, (v) => setConfig((p) => ({ ...p, level2: { ...p.level2, logText: v } })), true],
            ['Правильный ответ', config.level2.answer, (v) => setConfig((p) => ({ ...p, level2: { ...p.level2, answer: v } }))]
          ]} />

          <Editor title="Уровень 3" fields={[
            ['Название', config.level3.name, (v) => setConfig((p) => ({ ...p, level3: { ...p.level3, name: v } }))],
            ['Описание', config.level3.description, (v) => setConfig((p) => ({ ...p, level3: { ...p.level3, description: v } }))],
            ['Подсказка', config.level3.hint, (v) => setConfig((p) => ({ ...p, level3: { ...p.level3, hint: v } }))],
            ['Пароль', config.level3.password, (v) => setConfig((p) => ({ ...p, level3: { ...p.level3, password: v } }))],
            ['Количество попыток', String(config.level3.attempts), (v) => setConfig((p) => ({ ...p, level3: { ...p.level3, attempts: Number(v) || 1 } }))]
          ]} />

          <div className="adminActions">
            <button onClick={handleSaveConfig}>Сохранить настройки</button>
            <button onClick={resetDefaults}>Сбросить по умолчанию</button>
          </div>
        </section>
      )}
    </main>
  );
}

function LevelCard({ color, title, description, terminalText, answer, onAnswerChange, onCheck, result, helper, actions }) {
  return (
    <article className={`card ${color}`}>
      <h3>{title}</h3>
      <div className="terminal">
        <p>{description}</p>
        <pre>{terminalText}</pre>
      </div>
      <div className="inputRow">
        <input value={answer} onChange={(e) => onAnswerChange(e.target.value)} placeholder="Введи ответ" />
        <button onClick={onCheck}>Проверить</button>
      </div>
      {helper ? <p className="helper">{helper}</p> : null}
      {result ? <p className="result">{result}</p> : null}
      {actions ? <div className="actions">{actions}</div> : null}
    </article>
  );
}

function Editor({ title, fields }) {
  return (
    <div className="editor">
      <h3>{title}</h3>
      {fields.map(([label, value, onChange, multiline = false]) => (
        <label key={label}>
          <span>{label}</span>
          {multiline ? (
            <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={7} />
          ) : (
            <input value={value} onChange={(e) => onChange(e.target.value)} />
          )}
        </label>
      ))}
    </div>
  );
}
