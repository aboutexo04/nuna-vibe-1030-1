(function () {
  // API URL 설정
  // .env 파일의 API_URL 값과 동일하게 설정
  const HEROKU_API_URL = 'https://vibe-todo-backend-msy-a2473d9a7497.herokuapp.com/todos';
  const FALLBACK_LOCAL_URL = 'http://localhost:5003/api/todos';

  // 기본적으로 Heroku URL 사용, localStorage에서 사용자 설정 확인
  let API_BASE_URL = HEROKU_API_URL;

  // localStorage에서 사용자가 선택한 백엔드 확인
  try {
    const savedBackend = localStorage.getItem('backend_type'); // 'heroku' or 'local'
    const savedUrl = localStorage.getItem('api_url');

    if (savedBackend === 'local' && savedUrl) {
      API_BASE_URL = savedUrl;
      console.log('✅ 로컬 백엔드 사용:', API_BASE_URL);
    } else {
      // 기본값: Heroku 사용
      localStorage.setItem('backend_type', 'heroku');
      localStorage.setItem('api_url', HEROKU_API_URL);
      console.log('✅ Heroku 백엔드 사용:', API_BASE_URL);
    }
  } catch (e) {
    console.warn('⚠️ localStorage 읽기 실패, Heroku 사용:', e);
    API_BASE_URL = HEROKU_API_URL;
  }

  const formEl = document.getElementById('todo-form');
  const inputEl = document.getElementById('todo-input');
  const listEl = document.getElementById('todo-list');
  const templateEl = document.getElementById('todo-item-template');

  /** @type {{ id: string, text: string, createdAt?: Date }[]} */
  let todos = [];

  // 백엔드 응답을 앱 데이터 구조로 변환
  function mapBackendToApp(backendTodo) {
    return {
      id: backendTodo._id || backendTodo.id,
      text: backendTodo.title || backendTodo.text || '',
      createdAt: backendTodo.createdAt ? new Date(backendTodo.createdAt) : new Date()
    };
  }

  // 앱 데이터 구조를 백엔드 요청 형식으로 변환
  function mapAppToBackend(text) {
    return {
      title: text,
      priority: 'medium'
    };
  }


  async function fetchTodos() {
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        todos = result.data.map(mapBackendToApp);
        // createdAt 기준 내림차순 정렬 (최신순)
        todos.sort((a, b) => {
          const timeA = a.createdAt ? a.createdAt.getTime() : 0;
          const timeB = b.createdAt ? b.createdAt.getTime() : 0;
          return timeB - timeA;
        });
        renderTodos();
      } else {
        console.error('⚠️ 할일 조회 실패:', result.message);
        console.error('응답 구조:', result);
      }
    } catch (error) {
      console.error('할일 조회 오류:', error);
      console.error('에러 타입:', error.constructor.name);
      console.error('에러 메시지:', error.message);
      console.error('전체 에러 객체:', error);
      
      // Failed to fetch 에러 처리
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        showConnectionError(error);
      }
    }
  }
  
  // 연결 에러 표시 함수
  function showConnectionError(error = null) {
    const currentUrl = window.location.href;
    const isFileProtocol = currentUrl.startsWith('file://');
    
    let errorMsg = `❌ 백엔드 서버 연결 실패\n\n`;
    
    if (isFileProtocol) {
      errorMsg += `🔴 중요한 문제 발견!\n`;
      errorMsg += `현재 파일이 file:// 프로토콜로 열려있습니다.\n`;
      errorMsg += `CORS 정책 때문에 file://에서는 백엔드 서버에 연결할 수 없습니다.\n\n`;
      errorMsg += `✅ 해결 방법:\n`;
      errorMsg += `1. 터미널에서 프로젝트 폴더로 이동\n`;
      errorMsg += `2. 다음 명령 실행: python3 -m http.server 8000\n`;
      errorMsg += `3. 브라우저에서 http://localhost:8000 접속\n\n`;
    } else {
      // 403 Forbidden 또는 CORS 에러인 경우
      errorMsg += `🔴 백엔드 서버 연결 실패\n\n`;
      errorMsg += `⚠️ 중요한 발견: 포트 5000이 Apple AirPlay 서비스에 사용 중일 수 있습니다!\n`;
      errorMsg += `macOS에서는 포트 5000이 AirPlay Receiver에 기본으로 할당됩니다.\n\n`;
      errorMsg += `✅ 해결 방법:\n\n`;
      errorMsg += `방법 1: 백엔드 서버 포트 변경\n`;
      errorMsg += `   백엔드 서버를 다른 포트(예: 3000, 3001, 5001)로 실행하세요.\n\n`;
      errorMsg += `방법 2: 백엔드 서버 확인\n`;
      errorMsg += `   1. 백엔드 서버가 실제로 실행 중인지 확인\n`;
      errorMsg += `   2. 어떤 포트에서 실행 중인지 확인\n`;
      errorMsg += `   3. 터미널에서: netstat -an | grep LISTEN\n\n`;
      errorMsg += `방법 3: AirPlay 비활성화 (선택사항)\n`;
      errorMsg += `   시스템 설정 > AirPlay Receiver를 끄세요.\n\n`;
      errorMsg += `📋 추가 확인 사항:\n\n`;
      errorMsg += `1. CORS 설정 순서 확인\n`;
      errorMsg += `   app.use(cors()) 가 반드시 모든 라우트보다 위에 있어야 합니다!\n\n`;
      errorMsg += `2. 올바른 코드 순서:\n`;
      errorMsg += `   const express = require('express');\n`;
      errorMsg += `   const cors = require('cors');\n`;
      errorMsg += `   const app = express();\n\n`;
      errorMsg += `   // ✅ CORS는 맨 먼저\n`;
      errorMsg += `   app.use(cors({\n`;
      errorMsg += `     origin: '*',\n`;
      errorMsg += `     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],\n`;
      errorMsg += `     allowedHeaders: ['Content-Type']\n`;
      errorMsg += `   }));\n\n`;
      errorMsg += `   app.use(express.json());\n\n`;
      errorMsg += `   // ✅ 라우트는 나중에\n`;
      errorMsg += `   app.use('/api/todos', todoRoutes);\n\n`;
      errorMsg += `3. 인증 미들웨어 확인\n`;
      errorMsg += `   인증 미들웨어가 OPTIONS 요청을 차단하지 않는지 확인하세요.\n`;
      errorMsg += `   예: if (req.method === 'OPTIONS') return res.sendStatus(200);\n\n`;
      errorMsg += `4. 서버 재시작 확인\n`;
      errorMsg += `   코드 변경 후 반드시 서버를 재시작했는지 확인하세요.\n\n`;
      errorMsg += `5. 브라우저 콘솔 확인\n`;
      errorMsg += `   F12를 눌러 콘솔의 상세 에러를 확인하세요.\n\n`;
    }
    
    errorMsg += `🔍 현재 설정:\n`;
    errorMsg += `- API Base URL: ${API_BASE}\n`;
    errorMsg += `- API Full URL: ${API_BASE_URL}\n`;
    errorMsg += `- 현재 포트: ${currentPort}\n`;
    errorMsg += `- 프론트엔드: ${currentUrl}\n`;
    if (error) {
      errorMsg += `- 에러: ${error.message}\n`;
    }
    errorMsg += `\n💡 브라우저 콘솔(F12)에서 "사용할 백엔드 URL"을 확인하세요.`;
    
    console.error('🚨 연결 에러 상세:', {
      error: error?.message,
      apiUrl: API_BASE_URL,
      currentUrl: currentUrl,
      isFileProtocol: isFileProtocol
    });
    
    console.error('🔧 백엔드 CORS 설정 예시:');
    console.error(`
const cors = require('cors');
app.use(cors({
  origin: '*',  // 개발 환경용 (프로덕션에서는 특정 URL 지정)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
    `);
    
    alert(errorMsg);
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

  async function saveEditing(node) {
    const id = node.dataset.id;
    const input = node.querySelector('.todo-item__edit-input');
    const newText = input.value.trim();
    if (!newText) {
      // 빈 문자열은 편집 취소로 간주
      cancelEditing(node);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newText
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        await fetchTodos(); // 목록 새로고침
      } else {
        console.error('할일 수정 실패:', result.message);
        alert('할일 수정에 실패했습니다: ' + result.message);
      }
    } catch (error) {
      console.error('할일 수정 오류:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        alert('백엔드 서버에 연결할 수 없습니다. CORS 설정을 확인해주세요.');
      } else {
        alert('할일 수정 중 오류가 발생했습니다.');
      }
    }
  }

  function cancelEditing(node) {
    node.classList.remove('editing');
    const id = node.dataset.id;
    const todo = todos.find((t) => t.id === id);
    const input = node.querySelector('.todo-item__edit-input');
    input.value = todo ? todo.text : '';
  }

  async function deleteTodo(node) {
    const id = node.dataset.id;
    
    if (!confirm('정말 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        await fetchTodos(); // 목록 새로고침
      } else {
        console.error('할일 삭제 실패:', result.message);
        alert('할일 삭제에 실패했습니다: ' + result.message);
      }
    } catch (error) {
      console.error('할일 삭제 오류:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        alert('백엔드 서버에 연결할 수 없습니다. CORS 설정을 확인해주세요.');
      } else {
        alert('할일 삭제 중 오류가 발생했습니다.');
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mapAppToBackend(text))
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        inputEl.value = '';
        inputEl.focus();
        await fetchTodos(); // 목록 새로고침
      } else {
        console.error('할일 생성 실패:', result.message);
        alert('할일 생성에 실패했습니다: ' + result.message);
      }
    } catch (error) {
      console.error('할일 생성 오류:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        alert('백엔드 서버에 연결할 수 없습니다. localhost:5000이 실행 중인지 확인해주세요.\n또한 백엔드에서 CORS를 허용하도록 설정되어 있는지 확인해주세요.');
      } else {
        alert('할일 생성 중 오류가 발생했습니다.');
      }
    }
  }

  async function init() {
    console.log('🚀 앱 초기화 시작...');
    console.log('📍 사용할 백엔드:', API_BASE_URL);

    try {
      // 할일 목록 로드
      await fetchTodos();

      // 폼 이벤트 등록
      formEl.addEventListener('submit', handleSubmit);

      console.log('✅ 앱 초기화 완료');
    } catch (error) {
      console.error('❌ 앱 초기화 실패:', error);
      alert('백엔드 서버에 연결할 수 없습니다.\n\n현재 설정: ' + API_BASE_URL + '\n\n로컬 서버를 사용하려면 콘솔에서 다음을 실행하세요:\nlocalStorage.setItem("backend_type", "local");\nlocalStorage.setItem("api_url", "http://localhost:5003/api/todos");\n\n그 다음 페이지를 새로고침하세요.');
    }
  }

  init();
})();


