'use client';
import { useState } from 'react';

export default function CalculatorWidget() {
  const [display, setDisplay] = useState('0');
  const [stored, setStored] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  function inputDigit(d) {
    if (waitingForOperand) {
      setDisplay(String(d));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(d) : display + d);
    }
  }

  function inputDot() {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) setDisplay(display + '.');
  }

  function clearAll() {
    setDisplay('0');
    setStored(null);
    setOperator(null);
    setWaitingForOperand(false);
  }

  function toggleSign() {
    setDisplay(String(parseFloat(display) * -1));
  }

  function percent() {
    setDisplay(String(parseFloat(display) / 100));
  }

  function compute(a, b, op) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b === 0 ? NaN : a / b;
      default: return b;
    }
  }

  function performOperator(nextOp) {
    const inputValue = parseFloat(display);
    if (stored === null) {
      setStored(inputValue);
    } else if (operator) {
      const result = compute(stored, inputValue, operator);
      setDisplay(Number.isFinite(result) ? String(+result.toFixed(8)) : 'Error');
      setStored(Number.isFinite(result) ? result : null);
    }
    setWaitingForOperand(true);
    setOperator(nextOp);
  }

  function handleEquals() {
    if (operator === null || stored === null) return;
    const inputValue = parseFloat(display);
    const result = compute(stored, inputValue, operator);
    setDisplay(Number.isFinite(result) ? String(+result.toFixed(8)) : 'Error');
    setStored(null);
    setOperator(null);
    setWaitingForOperand(true);
  }

  const BTNS = [
    ['C', 'ac'], ['±', 'sign'], ['%', 'percent'], ['÷', 'op'],
    ['7', 'd'], ['8', 'd'], ['9', 'd'], ['×', 'op'],
    ['4', 'd'], ['5', 'd'], ['6', 'd'], ['-', 'op'],
    ['1', 'd'], ['2', 'd'], ['3', 'd'], ['+', 'op'],
    ['0', 'd0'], ['.', 'dot'], ['=', 'eq'],
  ];

  function press(label, kind) {
    if (kind === 'd') inputDigit(label);
    else if (kind === 'd0') inputDigit('0');
    else if (kind === 'dot') inputDot();
    else if (kind === 'ac') clearAll();
    else if (kind === 'sign') toggleSign();
    else if (kind === 'percent') percent();
    else if (kind === 'op') performOperator(label);
    else if (kind === 'eq') handleEquals();
  }

  return (
    <div className="widget-calc">
      <div className="widget-calc-display">{display}</div>
      <div className="widget-calc-grid">
        {BTNS.map(([label, kind]) => (
          <button
            key={label + kind}
            type="button"
            className={[
              'widget-calc-btn',
              kind === 'op' ? 'widget-calc-btn-op' : '',
              kind === 'eq' ? 'widget-calc-btn-eq' : '',
              label === '0' ? 'widget-calc-btn-wide' : '',
            ].join(' ').trim()}
            onClick={() => press(label, kind)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
