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

const configStorageKey = 'darkProtocolConfig';
const participantsStorageKey = 'darkProtocolParticipants';
const secretAdminCode = 'SecretAdmin';

function normalize(value) {
  return value.trim().toUpperCase();
}

export default function Home() {
  const [config, setConfig] = useState(defaultConfig);
  const [stage, setStage] = useState('init');
  const [username, setUsername] = useState('');
  const [inputName, setInputName] = useState('');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [answers, setAnswers] = useState({ level1: '', level2: '', level3: '' });
  const [attemptsLeft, setAttemptsLeft] = useState(defaultConfig.level3.attempts);
  const [modal, setModal] = useState({ open: false, status: 'loading', text: '' });
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    const rawConfig = localStorage.getItem(configStorageKey);
    if (rawConfig) {
      try {
        const parsed = JSON.parse(rawConfig);
        setConfig({
          level1: { ...defaultConfig.level1, ...parsed.level1 },
          level2: { ...defaultConfig.level2, ...parsed.level2 },
          level3: { ...defaultConfig.level3, ...parsed.level3 }
        });
        setAttemptsLeft(parsed.level3?.attempts || defaultConfig.level3.attempts);
      } catch {
        setConfig(defaultConfig);
      }
    }

    const rawParticipants = localStorage.getItem(participantsStorageKey);
    if (rawParticipants) {
      try {
        const parsedParticipants = JSON.parse(rawParticipants);
        if (Array.isArray(parsedParticipants)) {
          setParticipants(parsedParticipants);
        }
      } catch {
        setParticipants([]);
      }
    }
  }, []);

  useEffect(() => {
    setAttemptsLeft(config.level3.attempts);
  }, [config.level3.attempts]);

  const activeLevel = useMemo(() => {
    if (currentLevel === 1) {
      return {
        key: 'level1',
        color: 'green',
        title: `🟢 Уровень 1 — Лёгкий | ${config.level1.name}`,
        description: `${config.level1.description}\n💡 Для админа: введи специальный код вместо ответа.`,
        terminalText: config.level1.encodedText,
        answer: answers.level1,
        actions: null
      };
    }

    if (currentLevel === 2) {
      return {
        key: 'level2',
        color: 'yellow',
        title: `🟡 Уровень 2 — Средний | ${config.level2.name}`,
        description: config.level2.description,
        terminalText: config.level2.logText,
        answer: answers.level2,
        actions: null
      };
    }

    return {
      key: 'level3',
      color: 'red',
      title: `🔴 Уровень 3 — Сложный | ${config.level3.name}`,
      description: `${config.level3.description}\n${config.level3.hint}`,
      terminalText: `[FINAL ROUND]\nОсталось попыток: ${attemptsLeft}`,
      answer: answers.level3,
      actions: <button onClick={resetFinalRound}>Сбросить раунд</button>
    };
  }, [answers.level1, answers.level2, answers.level3, attemptsLeft, config, currentLevel]);

  const startGame = () => {
    const name = inputName.trim();
    if (!name) return;

    setUsername(name);
    setStage('game');

    setParticipants((prev) => {
      if (prev.includes(name)) {
        return prev;
      }
      const updated = [...prev, name];
      localStorage.setItem(participantsStorageKey, JSON.stringify(updated));
      return updated;
    });
  };

  const handleCheck = (level) => {
    const answerValue = answers[level].trim();

    if (level === 'level1' && answerValue === secretAdminCode) {
      setStage('admin');
      return;
    }

    const isLevel3 = level === 'level3';

    if (isLevel3 && attemptsLeft <= 0) {
      setModal({ open: true, status: 'error', text: 'Попытки закончились. Сбрось раунд или измени пароль в админ-панели.' });
      return;
    }

    setModal({ open: true, status: 'loading', text: 'Проверка ответа...' });

    window.setTimeout(() => {
      const isCorrect = isLevel3
        ? answerValue === config.level3.password.trim()
        : normalize(answerValue) === normalize(config[level].answer);

      if (isCorrect) {
        const doneText = level === 'level3' ? 'Доступ получен. Все испытания завершены.' : 'Ответ принят. Переход на следующий уровень.';
        setModal({ open: true, status: 'success', text: doneText });

        window.setTimeout(() => {
          setModal((prev) => ({ ...prev, open: false }));
          if (level === 'level1') {
            setCurrentLevel(2);
          }
          if (level === 'level2') {
            setCurrentLevel(3);
          }
        }, 1200);
        return;
      }

      if (isLevel3) {
        const next = attemptsLeft - 1;
        setAttemptsLeft(next);
        setModal({
          open: true,
          status: 'error',
          text: next > 0 ? `Неверно. Осталось попыток: ${next}` : 'Попытки закончились.'
        });
      } else {
        setModal({ open: true, status: 'error', text: 'Неверный ответ. Попробуй снова.' });
      }
    }, 1200);
  };

  function resetFinalRound() {
    setAttemptsLeft(config.level3.attempts);
    setAnswers((prev) => ({ ...prev, level3: '' }));
    setModal({ open: false, status: 'loading', text: '' });
  }

  const handleSaveConfig = () => {
    localStorage.setItem(configStorageKey, JSON.stringify(config));
    setAttemptsLeft(config.level3.attempts);
    setStage('game');
  };

  const resetDefaults = () => {
    setConfig(defaultConfig);
    localStorage.setItem(configStorageKey, JSON.stringify(defaultConfig));
    setAttemptsLeft(defaultConfig.level3.attempts);
  };

  if (stage === 'init') {
    return (
      <main className="page center">
        <section className="card initCard ambient">
          <div className="terminal">
            <pre>{`[ SYSTEM INITIALIZATION ]\n\nОбнаружен новый участник.\nВведите имя пользователя для доступа к испытанию.`}</pre>
          </div>
          <div className="inputRow">
            <input
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="Введите имя пользователя"
            />
            <button onClick={startGame}>Войти</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="header">
        <h1>Dark Protocol</h1>
        <p className="user">Участник: {username}</p>
      </header>

      {stage === 'admin' ? (
        <section className="admin card ambient">
          <div className="adminHeader">
            <h2>Админ-панель</h2>
            <button onClick={() => setStage('game')}>Назад в испытания</button>
          </div>
          <p>Секретный вход активирован. Меняй названия, шифры, пароли и попытки.</p>

          <div className="participantPanel terminal">
            <p>Участники: {participants.length}</p>
            <pre>{participants.length ? participants.map((name, index) => `${index + 1}. ${name}`).join('\n') : 'Пока нет участников'}</pre>
          </div>

          <Editor title="Уровень 1" fields={[
            ['Название', config.level1.name, (v) => setConfig((prev) => ({ ...prev, level1: { ...prev.level1, name: v } }))],
            ['Описание', config.level1.description, (v) => setConfig((prev) => ({ ...prev, level1: { ...prev.level1, description: v } }))],
            ['Зашифрованная строка', config.level1.encodedText, (v) => setConfig((prev) => ({ ...prev, level1: { ...prev.level1, encodedText: v } }))],
            ['Правильный ответ', config.level1.answer, (v) => setConfig((prev) => ({ ...prev, level1: { ...prev.level1, answer: v } }))]
          ]} />

          <Editor title="Уровень 2" fields={[
            ['Название', config.level2.name, (v) => setConfig((prev) => ({ ...prev, level2: { ...prev.level2, name: v } }))],
            ['Описание', config.level2.description, (v) => setConfig((prev) => ({ ...prev, level2: { ...prev.level2, description: v } }))],
            ['Лог системы', config.level2.logText, (v) => setConfig((prev) => ({ ...prev, level2: { ...prev.level2, logText: v } })), true],
            ['Правильный ответ', config.level2.answer, (v) => setConfig((prev) => ({ ...prev, level2: { ...prev.level2, answer: v } }))]
          ]} />

          <Editor title="Уровень 3" fields={[
            ['Название', config.level3.name, (v) => setConfig((prev) => ({ ...prev, level3: { ...prev.level3, name: v } }))],
            ['Описание', config.level3.description, (v) => setConfig((prev) => ({ ...prev, level3: { ...prev.level3, description: v } }))],
            ['Подсказка', config.level3.hint, (v) => setConfig((prev) => ({ ...prev, level3: { ...prev.level3, hint: v } }))],
            ['Пароль', config.level3.password, (v) => setConfig((prev) => ({ ...prev, level3: { ...prev.level3, password: v } }))],
            ['Количество попыток', String(config.level3.attempts), (v) => setConfig((prev) => ({ ...prev, level3: { ...prev.level3, attempts: Number(v) || 1 } }))]
          ]} />

          <div className="adminActions">
            <button onClick={handleSaveConfig}>Сохранить настройки</button>
            <button onClick={resetDefaults}>Сбросить по умолчанию</button>
          </div>
        </section>
      ) : (
        <section className="levels">
          <Progress currentLevel={currentLevel} />
          <LevelCard
            color={activeLevel.color}
            title={activeLevel.title}
            description={activeLevel.description}
            terminalText={activeLevel.terminalText}
            answer={activeLevel.answer}
            onAnswerChange={(value) => setAnswers((prev) => ({ ...prev, [activeLevel.key]: value }))}
            onCheck={() => handleCheck(activeLevel.key)}
            actions={activeLevel.actions}
          />
        </section>
      )}

      {modal.open ? <VerificationModal status={modal.status} text={modal.text} /> : null}
    </main>
  );
}

function Progress({ currentLevel }) {
  return (
    <div className="progress card ambient">
      <p>Прогресс доступа:</p>
      <div className="steps">
        {[1, 2, 3].map((step) => (
          <span key={step} className={currentLevel > step ? 'done' : currentLevel === step ? 'active' : ''}>
            Уровень {step}
          </span>
        ))}
      </div>
    </div>
  );
}

function LevelCard({ color, title, description, terminalText, answer, onAnswerChange, onCheck, actions }) {
  return (
    <article className={`card ${color} ambient`}>
      <h3>{title}</h3>
      <div className="terminal">
        <p>{description}</p>
        <pre>{terminalText}</pre>
      </div>
      <div className="inputRow">
        <input
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder="Введи ответ"
        />
        <button onClick={onCheck}>Проверить</button>
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </article>
  );
}

function VerificationModal({ status, text }) {
  return (
    <div className="verifyOverlay">
      <div className={`verifyCard ${status}`}>
        {status === 'loading' ? <div className="spinner" /> : null}
        {status === 'success' ? <div className="icon success">✓</div> : null}
        {status === 'error' ? <div className="icon error">✕</div> : null}
        <p>{text}</p>
      </div>
    </div>
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
