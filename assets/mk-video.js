import { Component } from '@theme/component';

/**
 * 自定义视频播放器组件，支持懒加载和响应式视频
 * @extends {Component}
 */

class MkVideoPlayer extends Component {
  /** @type {IntersectionObserver | null} */
  #observer = null;

  /** @type {boolean} */
  #isLoaded = false;

  /** @type {boolean} */
  #isPlaying = false;

  /** @type {AbortController} */
  #abortController = new AbortController();

  connectedCallback() {
    super.connectedCallback();

    const isLazyLoad = this.dataset.lazyLoad === "true";
    const isAutoplay = this.dataset.autoplay === "true";

    // 绑定播放按钮事件
    this.#bindPlayButtonEvents();

    if (isLazyLoad) {
      // 如果启用懒加载，设置 Intersection Observer
      this.#setupIntersectionObserver();
    } else {
      // 如果不启用懒加载，立即加载视频
      this.#loadVideo();
    }

    // 如果是自动播放且不是懒加载，立即播放
    if (isAutoplay && !isLazyLoad) {
      this.#playVideo();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    // 清理 Intersection Observer
    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = null;
    }

    // 清理事件监听器
    this.#abortController.abort();
  }

  /**
   * 设置 Intersection Observer 用于懒加载
   */
  #setupIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: "50px", // 提前 50px 开始加载
      threshold: 0.1, // 当 10% 的元素可见时触发
    };

    this.#observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !this.#isLoaded) {
          // 元素进入视口，加载视频
          this.#loadVideo();

          const isAutoplay = this.dataset.autoplay === "true";
          if (isAutoplay) {
            // 如果设置了自动播放，在视频加载后播放
            this.#playVideo();
          }

          // 停止观察（只需要加载一次）
          this.#observer?.disconnect();
        }
      });
    }, options);

    this.#observer.observe(this);
  }

  /**
   * 加载视频资源
   */
  #loadVideo() {
    if (this.#isLoaded) return;

    const videoType = this.dataset.videoType || "mp4";

    if (videoType === "youtube") {
      // 加载 YouTube iframe
      this.#loadYouTube();
    } else {
      // 加载 MP4 视频
      this.#loadMP4();
    }

    this.#isLoaded = true;
    this.classList.add("is-loaded");
  }

  /**
   * 加载 MP4 视频
   */
  #loadMP4() {
    const videoDesktop = this.dataset.videoDesktop;
    const videoMobile = this.dataset.videoMobile;
    const posterDesktop = this.dataset.posterDesktop;
    const posterMobile = this.dataset.posterMobile;

    if (!videoDesktop) {
      console.warn("MkVideoPlayer: No video source provided");
      return;
    }

    // 根据设备类型选择视频源和 poster
    const isMobile = window.matchMedia("(max-width: 749px)").matches;
    const videoSrc = isMobile && videoMobile ? videoMobile : videoDesktop;
    const posterSrc = isMobile && posterMobile ? posterMobile : posterDesktop;

    // 获取视频元素（现在只有一个）
    const video = this.querySelector(".mk-video__element");

    if (video instanceof HTMLVideoElement && videoSrc) {
      // 检查是否需要更换视频源
      const currentSrc = video.currentSrc || video.src;

      // 修复：当 src 被清空后（reset unload），需要重新设置
      // 之前的条件可能因为 currentSrc 是空字符串而判断错误
      const needsReload =
        !currentSrc || currentSrc === "" || currentSrc !== videoSrc;

      if (needsReload) {
        video.src = videoSrc;
        video.load();
      }

      // 设置 poster（如果有）
      if (posterSrc) {
        video.poster = posterSrc;
      }
    }
  }

  /**
   * 加载 YouTube iframe
   */
  #loadYouTube() {
    const youtubeDesktop = this.dataset.youtubeDesktop;
    const youtubeMobile = this.dataset.youtubeMobile;

    if (!youtubeDesktop) {
      console.warn("MkVideoPlayer: No YouTube source provided");
      return;
    }

    // 根据设备类型选择 YouTube URL
    const isMobile = window.matchMedia("(max-width: 749px)").matches;
    const youtubeSrc =
      isMobile && youtubeMobile ? youtubeMobile : youtubeDesktop;

    // 获取 iframe 元素（现在只有一个）
    const iframe = this.querySelector(".mk-video__iframe");

    if (iframe instanceof HTMLIFrameElement && youtubeSrc) {
      // 检查是否需要更换 iframe 源
      const currentSrc = iframe.src;

      // 如果需要的 URL 与当前不同，才更换
      if (!currentSrc || currentSrc !== youtubeSrc) {
        iframe.src = youtubeSrc;
      }
    }
  }

  /**
   * 绑定播放按钮事件
   */
  #bindPlayButtonEvents() {
    const playButtons = this.querySelectorAll(".mk-video__play-button");
    const signal = this.#abortController.signal;

    playButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          this.#handlePlayButtonClick();
        },
        { signal }
      );
    });
  }

  /**
   * 处理播放按钮点击
   */
  #handlePlayButtonClick() {
    const useModal = this.dataset.useModal === "true";

    if (useModal) {
      console.log("use modal");
      // 使用弹窗播放
      this.#openModalPlayer();
    } else {
      // 原位播放逻辑
      if (!this.#isLoaded) {
        this.#loadVideo();
      }
      this.#playVideo();
    }
  }

  /**
   * 打开弹窗播放器
   */
  #openModalPlayer() {
    const videoType = this.dataset.videoType || "mp4";

    // 如果已存在弹窗，先移除，避免多个实例
    const existingModal = document.querySelector(".mk-video-modal");
    if (existingModal instanceof HTMLElement) {
      existingModal.remove();
    }

    const modal = document.createElement("div");
    modal.className = "mk-video-modal active";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="mk-video-modal__content" onclick="event.stopPropagation()">
        <button class="mk-video-modal__close" type="button" aria-label="Close Video"></button>
        <div class="mk-video-modal__video-wrapper">
        </div>
      </div>
    `;

    const videoWrapper = modal.querySelector(".mk-video-modal__video-wrapper");

    if (!videoWrapper) return;

    // 根据类型创建对应的元素
    if (videoType === "youtube") {
      const youtubeDesktop = this.dataset.youtubeDesktop;
      const youtubeMobile = this.dataset.youtubeMobile || youtubeDesktop;

      if (!youtubeDesktop) {
        console.warn("MkVideoPlayer: No YouTube source provided for modal");
      } else {
        const isMobile = window.matchMedia("(max-width: 749px)").matches;
        const baseSrc =
          isMobile && youtubeMobile ? youtubeMobile : youtubeDesktop;

        // 弹窗中的 YouTube：
        // - 一定自动播放且静音（autoplay=1&mute=1）
        // - 一定显示控制栏（controls=1，便于暂停/调音量）
        let finalSrc = baseSrc || "";
        if (finalSrc) {
          const [urlPart, queryPart] = finalSrc.split("?");
          const params = new URLSearchParams(queryPart || "");

          // 覆盖自动播放和静音
          params.set("autoplay", "1");
          params.set("mute", "1");

          // 弹窗里强制显示控制栏
          params.set("controls", "1");

          finalSrc = urlPart + "?" + params.toString();
        }

        const iframe = document.createElement("iframe");
        iframe.className = "mk-video-modal__element mk-video-modal__iframe";
        iframe.src = finalSrc;
        iframe.allow = "autoplay; encrypted-media; picture-in-picture";
        iframe.allowFullscreen = true;
        iframe.frameBorder = "0";

        videoWrapper.appendChild(iframe);
      }
    } else {
      const videoDesktop = this.dataset.videoDesktop;
      const videoMobile = this.dataset.videoMobile || videoDesktop;
      const posterDesktop = this.dataset.posterDesktop || "";
      const posterMobile = this.dataset.posterMobile || posterDesktop;

      if (!videoDesktop) {
        console.warn("MkVideoPlayer: No video source provided for modal");
      } else {
        const isMobile = window.matchMedia("(max-width: 749px)").matches;
        const src = isMobile && videoMobile ? videoMobile : videoDesktop;
        const poster = isMobile && posterMobile ? posterMobile : posterDesktop;

        const video = document.createElement("video");
        video.className = "mk-video-modal__element";
        video.src = src;
        if (poster) {
          video.poster = poster;
        }

        // 控制选项从 data- 属性继承
        const loop = this.dataset.loop === "true";
        const muted = this.dataset.muted === "true";
        const controls = this.dataset.controls === "true";

        if (loop) video.loop = true;
        if (muted) video.muted = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.controls = controls || true; // 弹窗里默认开启控制栏

        videoWrapper.appendChild(video);

        // 在用户点击后自动播放
        const playPromise = video.play();
        if (playPromise && typeof playPromise.then === "function") {
          playPromise.catch((error) => {
            console.warn("MkVideoPlayer: Modal video playback failed", error);
          });
        }
      }
    }

    // 关闭逻辑：点击关闭按钮或背景
    const close = () => {
      const media = modal.querySelector(".mk-video-modal__element");
      if (media instanceof HTMLVideoElement) {
        media.pause();
      } else if (media instanceof HTMLIFrameElement) {
        // 移除 src 以停止 YouTube 播放
        media.src = "";
      }
      modal.classList.remove("active");
      // 等待动画完成后再移除
      setTimeout(() => {
        modal.remove();
      }, 300);
      document.documentElement.classList.remove("mk-video-modal-open");
    };

    const closeBtn = modal.querySelector(".mk-video-modal__close");
    const content = modal.querySelector(".mk-video-modal__content");

    // 点击背景关闭（点击 content 不会关闭，因为已经 stopPropagation）
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        close();
      }
    });
    closeBtn?.addEventListener("click", close);

    document.body.appendChild(modal);
    document.documentElement.classList.add("mk-video-modal-open");
  }

  /**
   * 播放视频
   */
  #playVideo() {
    if (this.#isPlaying) return;

    const videoType = this.dataset.videoType || "mp4";
    const element = this.#getCurrentVideo();

    if (!element) return;

    // 确保视频容器显示
    const container = this.querySelector(".mk-video__container");
    if (container instanceof HTMLElement) {
      container.style.display = "";
    }

    if (videoType === "youtube" && element instanceof HTMLIFrameElement) {
      // YouTube 播放
      element.contentWindow?.postMessage(
        '{"event":"command","func":"playVideo","args":""}',
        "*"
      );
      this.#isPlaying = true;
      this.classList.add("is-playing");
      this.classList.add("has-started"); // 标记视频已经开始播放
    } else if (element instanceof HTMLVideoElement) {
      // MP4 播放
      const playPromise = element.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.#isPlaying = true;
            this.classList.add("is-playing");
            this.classList.add("has-started"); // 标记视频已经开始播放
          })
          .catch((error) => {
            console.warn("MkVideoPlayer: Video playback failed", error);

            // 如果自动播放失败（通常是因为浏览器策略），可以显示播放按钮
            if (this.dataset.autoplay === "true") {
              this.removeAttribute("data-autoplay");
            }
          });
      }
    }
  }

  /**
   * 暂停视频
   */
  pauseVideo() {
    if (!this.#isPlaying) return;

    const videoType = this.dataset.videoType || "mp4";
    const element = this.#getCurrentVideo();

    if (!element) return;

    if (videoType === "youtube" && element instanceof HTMLIFrameElement) {
      // YouTube 暂停
      element.contentWindow?.postMessage(
        '{"event":"command","func":"pauseVideo","args":""}',
        "*"
      );
    } else if (element instanceof HTMLVideoElement) {
      // MP4 暂停
      element.pause();
    }

    this.#isPlaying = false;
    this.classList.remove("is-playing");
  }

  /**
   * 获取当前视频元素
   * @returns {HTMLVideoElement | HTMLIFrameElement | null}
   */
  #getCurrentVideo() {
    // 现在只有一个视频元素
    const element = this.querySelector(".mk-video__element");

    return element instanceof HTMLVideoElement ||
      element instanceof HTMLIFrameElement
      ? element
      : null;
  }

  /**
   * 公共 API：手动加载视频
   */
  loadVideo() {
    this.#loadVideo();
  }

  /**
   * 公共 API：手动播放视频
   */
  playVideo() {
    // 如果视频还未加载，先加载视频
    if (!this.#isLoaded) {
      this.#loadVideo();
    }

    // 播放视频
    this.#playVideo();
  }

  /**
   * 公共 API：静音视频
   */
  mute() {
    const element = this.#getCurrentVideo();
    const videoType = this.dataset.videoType || "mp4";

    if (videoType === "youtube" && element instanceof HTMLIFrameElement) {
      // YouTube 静音
      element.contentWindow?.postMessage(
        '{"event":"command","func":"mute","args":""}',
        "*"
      );
      this.dataset.muted = "true";
    } else if (element instanceof HTMLVideoElement) {
      element.muted = true;
      this.dataset.muted = "true";
    }
  }

  /**
   * 公共 API：取消静音视频
   */
  unmute() {
    const element = this.#getCurrentVideo();
    const videoType = this.dataset.videoType || "mp4";

    if (videoType === "youtube" && element instanceof HTMLIFrameElement) {
      // YouTube 取消静音
      element.contentWindow?.postMessage(
        '{"event":"command","func":"unMute","args":""}',
        "*"
      );
      this.dataset.muted = "false";
    } else if (element instanceof HTMLVideoElement) {
      element.muted = false;
      this.dataset.muted = "false";
    }
  }

  /**
   * 公共 API：切换静音状态
   */
  toggleMute() {
    const isMuted = this.dataset.muted === "true";

    if (isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  /**
   * 公共 API：检查是否静音
   * @returns {boolean}
   */
  isMuted() {
    return this.dataset.muted === "true";
  }

  /**
   * 公共 API：检查是否正在播放
   * @returns {boolean}
   */
  isPlaying() {
    return this.#isPlaying;
  }

  /**
   * 公共 API：重置视频到初始状态
   * @param {boolean|{unload?: boolean, disableAutoplay?: boolean}} [options] - 重置选项或布尔值（兼容旧 API）
   */
  reset(options) {
    // 默认选项
    let unload = false;
    let disableAutoplay = false;

    // 兼容旧的 API：reset(true) 等同于 reset({ unload: true })
    if (typeof options === "boolean") {
      unload = options;
    } else if (typeof options === "object" && options !== null) {
      unload = /** @type {{unload?: boolean}} */ (options).unload ?? false;
      disableAutoplay =
        /** @type {{disableAutoplay?: boolean}} */ (options).disableAutoplay ??
        false;
    }
    const videoType = this.dataset.videoType || "mp4";
    const element = this.#getCurrentVideo();
    const isLazyLoad = this.dataset.lazyLoad === "true";

    // 暂停视频
    if (this.#isPlaying) {
      this.pauseVideo();
    }

    // 重置播放状态
    this.#isPlaying = false;
    this.classList.remove("is-playing");
    this.classList.remove("has-started"); // 移除已播放标记，恢复封面显示

    // 如果需要禁用自动播放，临时移除 autoplay 属性
    if (disableAutoplay) {
      this.dataset.autoplayOriginal = this.dataset.autoplay || "";
      this.dataset.autoplay = "false";
    }

    if (videoType === "youtube" && element instanceof HTMLIFrameElement) {
      // YouTube 重置：停止并返回开始
      element.contentWindow?.postMessage(
        '{"event":"command","func":"stopVideo","args":""}',
        "*"
      );
      element.contentWindow?.postMessage(
        '{"event":"command","func":"seekTo","args":[0, true]}',
        "*"
      );

      // 如果要求卸载
      if (unload) {
        element.src = "";
        this.#isLoaded = false;
        this.classList.remove("is-loaded");

        // 如果启用了懒加载，重新设置 observer
        if (isLazyLoad && this.#observer) {
          this.#observer.disconnect();
          this.#observer = null;
          this.#setupIntersectionObserver();
        }
      }
    } else if (element instanceof HTMLVideoElement) {
      // MP4 重置：暂停并返回开始
      element.pause();
      element.currentTime = 0;

      // 如果要求卸载
      if (unload) {
        element.src = "";
        element.load();
        this.#isLoaded = false;
        this.classList.remove("is-loaded");

        // 如果启用了懒加载，重新设置 observer
        if (isLazyLoad && this.#observer) {
          this.#observer.disconnect();
          this.#observer = null;
          this.#setupIntersectionObserver();
        }
      }
    }

    // 如果启用了懒加载，隐藏视频容器（但不一定卸载资源）
    if (isLazyLoad) {
      const container = this.querySelector(".mk-video__container");
      if (container instanceof HTMLElement) {
        container.style.display = "none";
      }
    }
  }

  /**
   * 公共 API：恢复自动播放设置
   */
  restoreAutoplay() {
    if (this.dataset.autoplayOriginal !== undefined) {
      this.dataset.autoplay = this.dataset.autoplayOriginal;
      delete this.dataset.autoplayOriginal;
    }
  }
}

// 注册自定义元素
if (!customElements.get("mk-video-player")) {
  customElements.define("mk-video-player", MkVideoPlayer);
}
