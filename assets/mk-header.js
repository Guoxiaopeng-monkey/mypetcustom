import { Component } from '@theme/component';
import { onDocumentLoaded } from '@theme/utilities';

/**
 * MK Header Component - 自定义头部组件
 * 处理移动端菜单按钮和 drawer 的交互
 */
class MKHeaderComponent extends Component {
  connectedCallback() {
    super.connectedCallback();
    // 等待 DOM 完全加载后再初始化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.#initMobileMenu());
    } else {
      this.#initMobileMenu();
    }
  }

  /**
   * 初始化移动端菜单按钮和 drawer 的连接
   */
  #initMobileMenu() {
    // 查找 header-component 内的元素
    const headerComponent = document.querySelector('#mk-header-component');
    if (!headerComponent) return;

    const menuButton = headerComponent.querySelector('[data-mobile-menu-trigger]');
    const drawerDetails = /** @type {HTMLDetailsElement} */ (headerComponent.querySelector('#Details-menu-drawer-container'));
    const headerDrawer = /** @type {any} */ (drawerDetails?.closest('header-drawer'));
    
    if (!menuButton || !drawerDetails || !headerDrawer) {
      return;
    }

    // 更新按钮的 aria-expanded 状态和图标显示
    const updateButtonState = () => {
      const isOpen = drawerDetails.hasAttribute('open');
      menuButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      
      // 更新图标显示
      const openIcon = /** @type {HTMLElement} */ (menuButton.querySelector('.header-drawer-icon--open'));
      const closeIcon = /** @type {HTMLElement} */ (menuButton.querySelector('.header-drawer-icon--close'));
      if (openIcon && closeIcon) {
        if (isOpen) {
          openIcon.style.display = 'none';
          closeIcon.style.display = 'block';
        } else {
          openIcon.style.display = 'block';
          closeIcon.style.display = 'none';
        }
      }
    };
    
    // 监听 details 的 toggle 事件
    drawerDetails.addEventListener('toggle', updateButtonState);
    
    // 点击按钮时切换 drawer
    menuButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 直接切换 details 的 open 属性
      if (drawerDetails.hasAttribute('open')) {
        drawerDetails.removeAttribute('open');
        // 调用 header-drawer 的 close 方法以确保正确清理
        if (headerDrawer && typeof headerDrawer.close === 'function') {
          headerDrawer.close();
        }
      } else {
        drawerDetails.setAttribute('open', '');
        // 调用 header-drawer 的 open 方法以确保正确初始化
        if (headerDrawer && typeof headerDrawer.open === 'function') {
          headerDrawer.open();
        }
      }
    });
    
    // 初始化状态
    updateButtonState();
    
    // 初始化图标显示
    const openIcon = /** @type {HTMLElement} */ (menuButton.querySelector('.header-drawer-icon--open'));
    const closeIcon = /** @type {HTMLElement} */ (menuButton.querySelector('.header-drawer-icon--close'));
    if (openIcon && closeIcon) {
      openIcon.style.display = 'block';
      closeIcon.style.display = 'none';
    }
  }
}

if (!customElements.get('mk-header-component')) {
  customElements.define('mk-header-component', MKHeaderComponent);
}
