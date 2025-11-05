import { useState, useEffect } from 'react';
import './App.css';

// API URL 설정
const HEROKU_API_URL = 'https://vibe-todo-backend-msy-a2473d9a7497.herokuapp.com/todos';
const FALLBACK_LOCAL_URL = 'http://localhost:5003/api/todos';

// localStorage에서 백엔드 타입 가져오기
const getApiUrl = () => {
  try {
    const savedBackend = localStorage.getItem('backend_type');
    const savedUrl = localStorage.getItem('api_url');

    if (savedBackend === 'local' && savedUrl) {
      console.log('✅ 로컬 백엔드 사용:', savedUrl);
      return savedUrl;
    } else {
      localStorage.setItem('backend_type', 'heroku');
      localStorage.setItem('api_url', HEROKU_API_URL);
      console.log('✅ Heroku 백엔드 사용:', HEROKU_API_URL);
      return HEROKU_API_URL;
    }
  } catch (e) {
    console.warn('⚠️ localStorage 읽기 실패, Heroku 사용:', e);
    return HEROKU_API_URL;
  }
};

const API_BASE_URL = import.meta.env.VITE_API_URL || getApiUrl();

function App() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  // 백엔드 응답을 앱 데이터 구조로 변환
  const mapBackendToApp = (backendTodo) => ({
    id: backendTodo._id || backendTodo.id,
    text: backendTodo.title || backendTodo.text || '',
    createdAt: backendTodo.createdAt ? new Date(backendTodo.createdAt) : new Date()
  });

  // 할일 목록 조회
  const fetchTodos = async () => {
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        const mappedTodos = result.data.map(mapBackendToApp);
        // 최신순 정렬
        mappedTodos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setTodos(mappedTodos);
      }
    } catch (error) {
      console.error('할일 조회 오류:', error);
    }
  };

  // 컴포넌트 마운트 시 할일 목록 로드
  useEffect(() => {
    console.log('🚀 앱 초기화 시작...');
    console.log('📍 사용할 백엔드:', API_BASE_URL);
    fetchTodos();
  }, []);

  // 할일 추가
  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text, priority: 'medium' })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setInputValue('');
        await fetchTodos();
      } else {
        alert('할일 생성에 실패했습니다: ' + result.message);
      }
    } catch (error) {
      console.error('할일 생성 오류:', error);
      alert('백엔드 서버에 연결할 수 없습니다.');
    }
  };

  // 수정 모드 시작
  const startEditing = (todo) => {
    setEditingId(todo.id);
    setEditValue(todo.text);
  };

  // 수정 취소
  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  // 수정 저장
  const saveEditing = async (id) => {
    const newText = editValue.trim();
    if (!newText) {
      cancelEditing();
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newText })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        cancelEditing();
        await fetchTodos();
      } else {
        alert('할일 수정에 실패했습니다: ' + result.message);
      }
    } catch (error) {
      console.error('할일 수정 오류:', error);
      alert('백엔드 서버에 연결할 수 없습니다.');
    }
  };

  // 할일 삭제
  const deleteTodo = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        await fetchTodos();
      } else {
        alert('할일 삭제에 실패했습니다: ' + result.message);
      }
    } catch (error) {
      console.error('할일 삭제 오류:', error);
      alert('백엔드 서버에 연결할 수 없습니다.');
    }
  };

  // Enter 키 처리
  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditing(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  return (
    <div className="app">
      <h1 className="app__title">📝 Todo App</h1>

      <form className="todo-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="todo-form__input"
          placeholder="할일을 입력하세요..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          autoFocus
        />
        <button type="submit" className="todo-form__button">
          추가
        </button>
      </form>

      <ul className="todo-list">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className={`todo-item ${editingId === todo.id ? 'editing' : ''}`}
          >
            <div className="todo-item__view">
              <span className="todo-item__text">{todo.text}</span>
              <div className="todo-item__actions">
                <button
                  className="todo-item__edit-btn"
                  onClick={() => startEditing(todo)}
                >
                  수정
                </button>
                <button
                  className="todo-item__delete-btn"
                  onClick={() => deleteTodo(todo.id)}
                >
                  삭제
                </button>
              </div>
            </div>

            {editingId === todo.id && (
              <div className="todo-item__edit">
                <input
                  type="text"
                  className="todo-item__edit-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, todo.id)}
                  autoFocus
                />
                <div className="todo-item__edit-actions">
                  <button
                    className="todo-item__save-btn"
                    onClick={() => saveEditing(todo.id)}
                  >
                    저장
                  </button>
                  <button
                    className="todo-item__cancel-btn"
                    onClick={cancelEditing}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
