/**
 * Stellive Karaoke Web Project - script.js
 * 기능: notices.json 데이터를 불러와서 년/월별로 그룹화하여 화면에 출력
 */

document.addEventListener('DOMContentLoaded', () => {
    fetchNotices();
});

/**
 * 서버에서 공지사항 데이터를 비동기로 가져옵니다.
 */
async function fetchNotices() {
    const container = document.getElementById('notice-container');

    try {
        // 1. JSON 데이터 가져오기 (상대 경로)
        // index.html과 같은 위치에 notices.json이 있어야 합니다.
        const response = await fetch('assets/data/notices.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const notices = await response.json();

        // 데이터가 비어있는 경우 처리
        if (!notices || notices.length === 0) {
            container.innerHTML = '<p class="no-data">등록된 공지사항이 없습니다.</p>';
            return;
        }

        // 2. 최신순 정렬 (날짜 문자열 기준 내림차순)
        notices.sort((a, b) => b.date.localeCompare(a.date));

        // 3. 화면에 렌더링
        renderNotices(notices);

    } catch (error) {
        console.error('공지사항 로드 중 오류 발생:', error);
        container.innerHTML = `
            <div class="error-msg">
                <p>공지사항을 불러오는 중 오류가 발생했습니다.</p>
                <small>파일 경로 또는 서버 설정을 확인해주세요.</small>
            </div>
        `;
    }
}

/**
 * 가져온 공지 데이터를 HTML로 변환하여 화면에 그립니다.
 */
function renderNotices(notices) {
    const container = document.getElementById('notice-container');
    container.innerHTML = ''; // "불러오는 중" 메시지 삭제

    let currentGroup = ""; // 년-월 그룹 추적용 변수

    notices.forEach(notice => {
        /** 
         * 1. 그룹 헤더 생성 (년도/월)
         * notice.date가 "2026-04-30" 또는 "2026-04-30-10-20-30" 형식일 때 앞 7자(yyyy-mm) 추출
         */
        const dateString = notice.date;
        const yearMonthKey = dateString.substring(0, 7); // 예: "2026-04"

        if (currentGroup !== yearMonthKey) {
            currentGroup = yearMonthKey;
            
            const [year, month] = yearMonthKey.split('-');
            const groupHeader = document.createElement('h2');
            groupHeader.className = 'group-header';
            groupHeader.innerHTML = `📅 ${year}년 ${parseInt(month)}월`;
            container.appendChild(groupHeader);
        }

        /** 
         * 2. 공지 카드 생성
         */
        const noticeCard = document.createElement('div');
        noticeCard.className = 'notice-card';

        // 시간 형식 보정: JSON에 hh-mm-ss가 없으면 기본값 부여, 있으면 그대로 사용
        let fullTime = dateString;
        if (dateString.length <= 10) {
            fullTime = `${dateString}-00-00-00`;
        }

        // [New] 배지 표시 로직 (최근 2일 이내 공지)
        const noticeDate = new Date(dateString.substring(0, 10));
        const now = new Date();
        const diffTime = Math.abs(now - noticeDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const newBadge = (diffDays <= 2) ? '<span class="new-badge">NEW</span>' : '';

        // 본문 내 줄바꿈(\n)을 웹 브라우저용 <br>로 변환
        const formattedBody = notice.body.replace(/\n/g, '<br>');

        noticeCard.innerHTML = `
            <div class="notice-time">${fullTime}</div>
            <div class="notice-title">
                <h3>${notice.title} ${newBadge}</h3>
            </div>
            <div class="notice-body">
                <p>${formattedBody}</p>
            </div>
        `;
        
        container.appendChild(noticeCard);
    });
}
