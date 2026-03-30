import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

window.supabase = createClient(
  'https://slshszobaevzclajcjly.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsc2hzem9iYWV2emNsYWpjamx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjE1NTcsImV4cCI6MjA5MDIzNzU1N30.wIppeHPabfdSPQ2FrnXt_1MSxfTJe_ci_7gns0DkLyo'
);

console.log("Proyecto conectado:", supabase.supabaseUrl);

function getFingerprint() {
  const nav = navigator;
  const raw = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset()
  ].join("|");

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

const fingerprint = getFingerprint();

async function likePost(postId, btn) {
  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("post_id", postId)
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (existing) return;

  const { error: insertError } = await supabase
    .from("likes")
    .insert({ post_id: postId, fingerprint });

  if (insertError) {
    console.error("Error insertando like:", insertError);
    return;
  }

  await supabase.rpc("increment_likes", { post_id: postId });

  btn.classList.add("liked");
  btn.disabled = true;
  const counter = btn.querySelector(".like-count");
  counter.textContent = parseInt(counter.textContent) + 1;
}

async function loadPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Error cargando posts:", error);
    return;
  }

  const { data: myLikes } = await supabase
    .from("likes")
    .select("post_id")
    .eq("fingerprint", fingerprint);

  const likedIds = new Set((myLikes || []).map(l => l.post_id));

  const feed = document.getElementById("feed");

  feed.innerHTML = data.map(p => {
    let hora = "";
    if (p.time) {
      const [hours, minutes] = p.time.split(":");
      const h = parseInt(hours);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      hora = `${h12}:${minutes} ${ampm}`;
    }

    const yaLikeo = likedIds.has(p.id);

    return `
      <div class="post fade-in">
        <div class="post-header">
          <span class="post-date">${p.date || ""} · ${hora}</span>
        </div>
        <div class="post-content">${p.content || ""}</div>
        ${p.image ? `<img src="${p.image}" class="post-img">` : ""}
        <div class="post-footer">
          <button class="like-btn ${yaLikeo ? "liked" : ""}" ${yaLikeo ? "disabled" : ""} onclick="likePost(${p.id}, this)">
            ♥ <span class="like-count">${p.likes || 0}</span>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

async function loadVisitors() {
  await supabase.rpc("increment_visitors", { visitor_fingerprint: fingerprint });

  const { data, error } = await supabase
    .from("visitors")
    .select("count")
    .single();

  if (error || !data) return;

  const count = String(data.count).padStart(6, "0");
  const display = document.getElementById("visitor-count");
  if (display) {
    display.innerHTML = count.split("").map(d => `<span class="digit">${d}</span>`).join("");
  }
}

window.likePost = likePost;
loadPosts();
loadVisitors();
