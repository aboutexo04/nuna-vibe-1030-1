import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-analytics.js";
import { getDatabase, ref, push, update, remove, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAEBzDHFb8XfPbN80zmqE5yPRXk7pu7wh4",
  authDomain: "nuna-todo-backend.firebaseapp.com",
  projectId: "nuna-todo-backend",
  storageBucket: "nuna-todo-backend.firebasestorage.app",
  messagingSenderId: "142544709937",
  appId: "1:142544709937:web:de40cab2447ccfdf712810",
  measurementId: "G-PNH7W6C1EK",
  databaseURL: "https://nuna-todo-backend-default-rtdb.firebaseio.com",

};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
window.firebaseApp = app;
const db = getDatabase(app);

(function () {
  const formEl = document.getElementById('todo-form');
  const inputEl = document.getElementById('todo-input');
  const listEl = document.getElementById('todo-list');
  const templateEl = document.getElementById('todo-item-template');

  /** @type {{ id: string, text: string, createdAt?: number }[]} */
  let todos = [];

  const todosRef = ref(db, 'todos');

  function subscribeTodos() {
    onValue(todosRef, (snapshot) => {
      const next = [];
      snapshot.forEach((child) => {
        const val = child.val() || {};
        next.push({ id: child.key, text: val.text || '', createdAt: val.createdAt || 0 });
      });
      next.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      todos = next;
      renderTodos();
    });
  }

  function createTodo(text) {
    return { text, createdAt: Date.now() };
  }

  function renderTodos() {
    listEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (const item of todos) {
      const node = templateEl.content.firstElementChild.cloneNode(true);
      node.dataset.id = item.id;

      const textSpan = node.querySelector('.todo-item__text');
      const editInput = node.querySelector('.todo-item__edit-input');
      const editBtn = node.querySelector('.js-edit');
      const saveBtn = node.querySelector('.js-save');
      const cancelBtn = node.querySelector('.js-cancel');
      const deleteBtn = node.querySelector('.js-delete');

      textSpan.textContent = item.text;
      editInput.value = item.text;

      editBtn.addEventListener('click', () => startEditing(node));
      saveBtn.addEventListener('click', () => saveEditing(node));
      cancelBtn.addEventListener('click', () => cancelEditing(node));
      deleteBtn.addEventListener('click', () => deleteTodo(node));

      editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveEditing(node); }
        if (e.key === 'Escape') { e.preventDefault(); cancelEditing(node); }
      });

      frag.appendChild(node);
    }
    listEl.appendChild(frag);
  }

  function startEditing(node) {
    node.classList.add('editing');
    const input = node.querySelector('.todo-item__edit-input');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function saveEditing(node) {
    const id = node.dataset.id;
    const input = node.querySelector('.todo-item__edit-input');
    const newText = input.value.trim();
    if (!newText) {
      // 빈 문자열은 편집 취소로 간주
      cancelEditing(node);
      return;
    }
    update(ref(db, `todos/${id}`), { text: newText });
  }

  function cancelEditing(node) {
    node.classList.remove('editing');
    const id = node.dataset.id;
    const todo = todos.find((t) => t.id === id);
    const input = node.querySelector('.todo-item__edit-input');
    input.value = todo ? todo.text : '';
  }

  function deleteTodo(node) {
    const id = node.dataset.id;
    remove(ref(db, `todos/${id}`));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    const payload = createTodo(text);
    push(todosRef, { ...payload, createdAt: serverTimestamp() });
    inputEl.value = '';
    inputEl.focus();
  }

  function init() {
    subscribeTodos();
    formEl.addEventListener('submit', handleSubmit);
  }

  init();
})();


