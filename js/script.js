document.addEventListener('DOMContentLoaded', () => {
    fetchNotices();
    fetchLastUpdateTime(); // ✅ 파일 수정 시간 가져오기 함수 호출
});

// 1. GitHub API를 이용해 파일의 실제 수정 시간 가져오기
async function fetchLastUpdateTime() {
    try {
        // GitHub API를 통해 파일 정보 조회 (사용자명/리포지토리명/경로 확인 필요)
        const response = await fetch('https://api.github.com/repos/skrtjd/stellive_karaoke_app_data/commits?path=assets/data/notices.json&page=1&per_page=1');
        const commits = await response.json();
        
        if (commits && commits.length > 0) {
            const lastDate = new Date(commits[0].commit.committer.date);
            
            // yyyy-mm-dd-hh-mm-ss 형식으로 변환
            const year = lastDate.getFullYear();
            const month = String(lastDate.getMonth() + 1).padStart(2, '0');
            const day = String(lastDate.getDate()).padStart(2, '0');
            const hours = String(lastDate.getHours()).padStart(2, '0');
            const mins = String(lastDate.getMinutes()).padStart(2, '0');
            const secs = String(lastDate.getSeconds()).padStart(2, '0');
            
            const formattedTime = `최근 공지 업데이트: ${year}-${month}-${day}-${hours}-${mins}-${secs}`;
            document.getElementById('last-update-time').innerText = formattedTime;
        }
    } catch (error) {
        console.error('업데이트 시간 로드 실패:', error);
    }
}

async function fetchNotices() {
    try {
        const response = await fetch('assets/data/notices.json');
        const notices = await response.json();
        notices.sort((a, b) => b.date.localeCompare(a.date));
        renderNotices(notices);
    } catch (error) {
        console.error('로드 실패:', error);
    }
}

function renderNotices(notices) {
    const container = document.getElementById('notice-container');
    container.innerHTML = '';

    let currentGroup = "";
    let currentContentDiv = null;

    notices.forEach((notice, index) => {
        const yearMonthKey = notice.date.substring(0, 7);
        const [year, month] = yearMonthKey.split('-');

        // 새로운 월 그룹 시작
        if (currentGroup !== yearMonthKey) {
            currentGroup = yearMonthKey;

            // 헤더(버튼) 생성
            const groupHeader = document.createElement('button');
            groupHeader.className = 'group-header accordion';
            groupHeader.innerHTML = `📅 ${year}년 ${parseInt(month)}월 <span class="arrow">▼</span>`;
            container.appendChild(groupHeader);

            // 공지들을 담을 컨텐츠 영역 생성
            currentContentDiv = document.createElement('div');
            currentContentDiv.className = 'panel';
            // 기본적으로 첫 번째(최신) 월만 열어두고 나머지는 닫고 싶다면 조건부 추가 가능
            // currentContentDiv.style.display = (index === 0) ? "block" : "none"; 
            container.appendChild(currentContentDiv);

            // 클릭 이벤트 추가 (접기/펴기)
            groupHeader.addEventListener('click', function() {
                this.classList.toggle('active');
                const panel = this.nextElementSibling;
                const arrow = this.querySelector('.arrow');
                if (panel.style.display === "block") {
                    panel.style.display = "none";
                    arrow.innerText = "▶";
                } else {
                    panel.style.display = "block";
                    arrow.innerText = "▼";
                }
            });
        }

        // 공지 카드 생성
        const noticeCard = document.createElement('div');
        noticeCard.className = 'notice-card';

        // ✅ 개별 공지 시간은 yyyy-mm-dd로만 표시
        const displayDate = notice.date.substring(0, 10);

        noticeCard.innerHTML = `
            <div class="notice-time">${displayDate}</div>
            <div class="notice-title"><h3>${notice.title}</h3></div>
            <div class="notice-body"><p>${notice.body.replace(/\n/g, '<br>')}</p></div>
        `;
        
        currentContentDiv.appendChild(noticeCard);
    });
}
