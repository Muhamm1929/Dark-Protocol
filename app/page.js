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
    attempts: 10,
    hint: 'Пароль состоит из 4 символов и использует только цифры.'
  }
};

const configStorageKey = 'darkProtocolConfig';
const participantsStorageKey = 'darkProtocolParticipants';
const modeStorageKey = 'darkProtocolMode';
const secretAdminCode = 'SecretAdmin';

function normalize(value) {
  return value.trim().toUpperCase();
}

export default function Home() {
  const [config, setConfig] = useState(defaultConfig);
  const [stage, setStage] = useState('init');
  const [systemMode, setSystemMode] = useState('running');
  const [username, setUsername] = useState('');
  const [inputName, setInputName] = useState('');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [answers, setAnswers] = useState({ level1: '', level2: '', level3: '' });
  const [attemptsLeft, setAttemptsLeft] = useState(defaultConfig.level3.attempts);
  const [modal, setModal] = useState({ open: false, status: 'loading', text: '' });
  const [participants, setParticipants] = useState([]);
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(-1);
  const [telegramInput, setTelegramInput] = useState('');
  const [adminGateOpen, setAdminGateOpen] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    const rawConfig = localStorage.getItem(configStorageKey);
    if (rawConfig) {
      try {
        const parsed = JSON.parse(rawConfig);
        setConfig({
          level1: { ...defaultConfig.level1, ...parsed.level1 },
          level2: { ...defaultConfig.level2, ...parsed.level2 },
          level3: { ...defaultConfig.level3, ...parsed.level3, attempts: 10 }
        });
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

    const rawMode = localStorage.getItem(modeStorageKey);
    if (rawMode === 'waiting' || rawMode === 'completed' || rawMode === 'running') {
      setSystemMode(rawMode);
    }
  }, []);

  useEffect(() => {
    setAttemptsLeft(10);
  }, [config.level3.password]);

  const activeLevel = useMemo(() => {
    if (currentLevel === 1) {
      return {
        key: 'level1',
        color: 'green',
        title: `🟢 Уровень 1 — Лёгкий | ${config.level1.name}`,
        description: config.level1.description,
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

  const persistParticipants = (next) => {
    setParticipants(next);
    localStorage.setItem(participantsStorageKey, JSON.stringify(next));
  };

  const startGame = () => {
    if (systemMode !== 'running') return;

    const name = inputName.trim();
    if (!name) return;

    const created = {
      name,
      status: 'in_progress',
      telegram: ''
    };

    const updated = [...participants, created];
    persistParticipants(updated);
    setCurrentParticipantIndex(updated.length - 1);
    setUsername(name);
    setCurrentLevel(1);
    setAttemptsLeft(10);
    setAnswers({ level1: '', level2: '', level3: '' });
    setTelegramInput('');
    setStage('game');
  };

  const markParticipant = (status, telegram = '') => {
    if (currentParticipantIndex < 0) return;

    const updated = [...participants];
    const participant = updated[currentParticipantIndex];
    if (!participant) return;

    updated[currentParticipantIndex] = {
      ...participant,
      status,
      telegram
    };

    persistParticipants(updated);
  };

  const handleCheck = (level) => {
    const answerValue = answers[level].trim();
    const isLevel3 = level === 'level3';

    if (level === 'level1' && answerValue === secretAdminCode) {
      setStage('admin');
      return;
    }

    if (isLevel3 && attemptsLeft <= 0) {
      setStage('denied');
      markParticipant('failed');
      return;
    }

    setModal({ open: true, status: 'loading', text: 'Проверка ответа...' });

    window.setTimeout(() => {
      const isCorrect = isLevel3
        ? answerValue === config.level3.password.trim()
        : normalize(answerValue) === normalize(config[level].answer);

      if (isCorrect) {
        setModal({ open: true, status: 'success', text: 'Ответ принят.' });
        window.setTimeout(() => {
          setModal({ open: false, status: 'loading', text: '' });
          if (level === 'level1') setCurrentLevel(2);
          if (level === 'level2') setCurrentLevel(3);
          if (level === 'level3') {
            setStage('granted');
            markParticipant('approved', '');
          }
        }, 900);
        return;
      }

      if (isLevel3) {
        const next = attemptsLeft - 1;
        setAttemptsLeft(next);

        if (next <= 0) {
          setModal({ open: false, status: 'loading', text: '' });
          setStage('denied');
          markParticipant('failed');
          return;
        }

        setModal({
          open: true,
          status: 'error',
          text: `Неверно. Осталось попыток: ${next}`
        });
      } else {
        setModal({ open: true, status: 'error', text: 'Неверный ответ. Попробуй снова.' });
      }
    }, 1000);
  };

  function resetFinalRound() {
    setAttemptsLeft(10);
    setAnswers((prev) => ({ ...prev, level3: '' }));
    setModal({ open: false, status: 'loading', text: '' });
  }

  const submitTelegram = () => {
    const tg = telegramInput.trim();
    markParticipant('approved', tg);
    setTelegramInput(tg);
  };

  const handleSaveConfig = () => {
    const safeConfig = {
      ...config,
      level3: {
        ...config.level3,
        attempts: 10
      }
    };
    setConfig(safeConfig);
    localStorage.setItem(configStorageKey, JSON.stringify(safeConfig));
  };

  const resetDefaults = () => {
    setConfig(defaultConfig);
    localStorage.setItem(configStorageKey, JSON.stringify(defaultConfig));
    setAttemptsLeft(10);
  };

  const changeMode = (mode) => {
    setSystemMode(mode);
    localStorage.setItem(modeStorageKey, mode);
    setStage('init');
    setUsername('');
    setInputName('');
    setCurrentParticipantIndex(-1);
  };

  const tryOpenAdmin = () => {
    if (adminCodeInput.trim() === secretAdminCode) {
      setStage('admin');
      setAdminGateOpen(false);
      setAdminCodeInput('');
      setAdminError('');
      return;
    }
    setAdminError('Неверный код доступа.');
  };

  if (stage === 'granted') {
    return (
      <main className="page center">
        <section className="card initCard ambient">
          <div className="terminal">
            <pre>{`[ ACCESS GRANTED ]\nПоздравляем, участник.\nВы смогли пройти испытание и доказали свои навыки.\n\nЧтобы получить награду,\nоставьте свой Telegram username ниже.`}</pre>
          </div>
          <div className="inputRow">
            <input
              value={telegramInput}
              onChange={(event) => setTelegramInput(event.target.value)}
              placeholder="@telegram_username"
            />
            <button onClick={submitTelegram}>Отправить</button>
          </div>
          <p className="teamLine">By Muhammad Team</p>
          <FooterAdminButton onOpen={() => setAdminGateOpen(true)} />
        </section>
        {adminGateOpen ? <AdminGateModal adminCodeInput={adminCodeInput} setAdminCodeInput={setAdminCodeInput} adminError={adminError} onSubmit={tryOpenAdmin} onClose={() => setAdminGateOpen(false)} /> : null}
      </main>
    );
  }

  if (stage === 'denied') {
    return (
      <main className="page center">
        <section className="card initCard ambient">
          <div className="terminal">
            <pre>{`[ ACCESS DENIED ]\n\nПароль неверный.\nСистема отклонила попытку доступа.\n\nИспытание не пройдено.`}</pre>
          </div>
          <FooterAdminButton onOpen={() => setAdminGateOpen(true)} />
        </section>
        {adminGateOpen ? <AdminGateModal adminCodeInput={adminCodeInput} setAdminCodeInput={setAdminCodeInput} adminError={adminError} onSubmit={tryOpenAdmin} onClose={() => setAdminGateOpen(false)} /> : null}
      </main>
    );
  }

  if (stage === 'init' && systemMode === 'waiting') {
    return (
      <main className="page center">
        <section className="card initCard ambient">
          <div className="terminal">
            <pre>{`[ SYSTEM LOADING ]\n\nПодготовка испытания...\nПожалуйста, ожидайте.`}</pre>
          </div>
          <FooterAdminButton onOpen={() => setAdminGateOpen(true)} />
        </section>
        {adminGateOpen ? <AdminGateModal adminCodeInput={adminCodeInput} setAdminCodeInput={setAdminCodeInput} adminError={adminError} onSubmit={tryOpenAdmin} onClose={() => setAdminGateOpen(false)} /> : null}
      </main>
    );
  }

  if (stage === 'init' && systemMode === 'completed') {
    return (
      <main className="page center">
        <section className="card initCard ambient">
          <div className="terminal">
            <pre>{`[ TEST COMPLETED ]\n\nИспытание завершено.\nСпасибо за участие.\n\nОжидайте другие наши испытания.`}</pre>
          </div>
          <FooterAdminButton onOpen={() => setAdminGateOpen(true)} />
        </section>
        {adminGateOpen ? <AdminGateModal adminCodeInput={adminCodeInput} setAdminCodeInput={setAdminCodeInput} adminError={adminError} onSubmit={tryOpenAdmin} onClose={() => setAdminGateOpen(false)} /> : null}
      </main>
    );
  }

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
              onChange={(event) => setInputName(event.target.value)}
              placeholder="Введите имя пользователя"
            />
            <button onClick={startGame}>Войти</button>
          </div>
          <FooterAdminButton onOpen={() => setAdminGateOpen(true)} />
        </section>
        {adminGateOpen ? <AdminGateModal adminCodeInput={adminCodeInput} setAdminCodeInput={setAdminCodeInput} adminError={adminError} onSubmit={tryOpenAdmin} onClose={() => setAdminGateOpen(false)} /> : null}
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
            <button onClick={() => setStage('init')}>Выйти</button>
          </div>

          <div className="adminActions">
            <button onClick={() => changeMode('running')}>Возобновить испытание</button>
            <button onClick={() => changeMode('waiting')}>Ожидание</button>
            <button onClick={() => changeMode('completed')}>Закончить испытание</button>
          </div>

          <div className="participantPanel terminal">
            <p>Журнал участников: {participants.length}</p>
            <pre>
              {participants.length
                ? participants.map((participant) => (
                  participant.status === 'approved'
                    ? `${participant.name}  approved  ${participant.telegram || '@telegram_not_set'}.`
                    : participant.status === 'failed'
                      ? `${participant.name}  failed`
                      : `${participant.name}  in progress`
                )).join('\n')
                : 'Пока нет участников'}
            </pre>
          </div>

          <Editor title="Уровень 1" fields={[
            ['Название', config.level1.name, (value) => setConfig((prev) => ({ ...prev, level1: { ...prev.level1, name: value } }))],
            ['Описание', config.level1.description, (value) => setConfig((prev) => ({ ...prev, level1: { ...prev.level1, description: value } }))],
            ['Зашифрованная строка', config.level1.encodedText, (value) => setConfig((prev) => ({ ...prev, level1: { ...prev.level1, encodedText: value } }))],
            ['Правильный ответ', config.level1.answer, (value) => setConfig((prev) => ({ ...prev, level1: { ...prev.level1, answer: value } }))]
          ]} />

          <Editor title="Уровень 2" fields={[
            ['Название', config.level2.name, (value) => setConfig((prev) => ({ ...prev, level2: { ...prev.level2, name: value } }))],
            ['Описание', config.level2.description, (value) => setConfig((prev) => ({ ...prev, level2: { ...prev.level2, description: value } }))],
            ['Лог системы', config.level2.logText, (value) => setConfig((prev) => ({ ...prev, level2: { ...prev.level2, logText: value } })), true],
            ['Правильный ответ', config.level2.answer, (value) => setConfig((prev) => ({ ...prev, level2: { ...prev.level2, answer: value } }))]
          ]} />

          <Editor title="Уровень 3" fields={[
            ['Название', config.level3.name, (value) => setConfig((prev) => ({ ...prev, level3: { ...prev.level3, name: value } }))],
            ['Описание', config.level3.description, (value) => setConfig((prev) => ({ ...prev, level3: { ...prev.level3, description: value } }))],
            ['Подсказка', config.level3.hint, (value) => setConfig((prev) => ({ ...prev, level3: { ...prev.level3, hint: value } }))],
            ['Пароль', config.level3.password, (value) => setConfig((prev) => ({ ...prev, level3: { ...prev.level3, password: value, attempts: 10 } }))],
            ['Попытки (фиксировано)', '10', () => {}]
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

function FooterAdminButton({ onOpen }) {
  return (
    <button className="adminTinyButton" onClick={onOpen}>админ панель</button>
  );
}

function AdminGateModal({ adminCodeInput, setAdminCodeInput, adminError, onSubmit, onClose }) {
  return (
    <div className="verifyOverlay">
      <div className="verifyCard loading">
        <p>Введите секретный код администратора</p>
        <input
          value={adminCodeInput}
          onChange={(event) => setAdminCodeInput(event.target.value)}
          placeholder="Secret code"
        />
        {adminError ? <p className="errorText">{adminError}</p> : null}
        <div className="actions">
          <button onClick={onSubmit}>Войти</button>
          <button onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
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
          onChange={(event) => onAnswerChange(event.target.value)}
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
            <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={7} />
          ) : (
            <input value={value} onChange={(event) => onChange(event.target.value)} disabled={label === 'Попытки (фиксировано)'} />
          )}
        </label>
      ))}
    </div>
  );
}
