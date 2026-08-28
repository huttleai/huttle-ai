import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Edit3,
  FileText,
  FolderOpen,
  FolderPlus,
  Hash,
  Inbox,
  Layers,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useIsMobile } from '../hooks/useIsMobile';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import PostKitCard from '../components/PostKitCard';
import {
  addItemsToCollection,
  createContentCollection,
  deleteContentLibraryItem,
  getContentCollectionItems,
  getContentCollections,
  getContentLibraryItems,
  setContentItemCollections,
  updateContentLibraryItem,
} from '../config/supabase';
import { saveToVault, CONTENT_VAULT_UPDATED_EVENT } from '../services/contentService';
import {
  buildUseAgainTarget,
  CONTENT_TYPE_CONFIG,
  CONTENT_TYPE_FILTERS,
  getPlatformOption,
  humanizeToolSource,
  isHiddenVaultCollectionName,
  isVaultRow,
  mapContentRowToVaultItem,
  PLATFORM_OPTIONS,
} from '../utils/contentVault';

/** Display-only labels for vault content types (not persisted). */
const DISPLAY_NAMES = {
  opening_line: 'Caption',
  caption: 'Caption',
  hashtags: 'Hashtags',
  hashtag: 'Hashtags',
  hook: 'Hook',
  cta: 'CTA',
  image_description: 'Visual Ideas',
  visual: 'Visual Ideas',
  'visual-prompt': 'Visual Ideas',
  score: 'Quality Score',
  plan: 'Content Plan',
  blueprint: 'Ignite Engine',
  remix: 'Remix',
};

function getContentTypeDisplayLabel(contentType) {
  const key = String(contentType || '').toLowerCase();
  return DISPLAY_NAMES[key] || CONTENT_TYPE_CONFIG[key]?.singular || (key ? key : 'Saved');
}
import { deleteKit, getUserKits, POSTKIT_PENDING_STORAGE_KEY } from '../services/postKitService';

function formatDate(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function stripContentLabel(text) {
  if (!text) return '';
  return text.replace(/^(Hook|Caption|Script|CTA|Hashtags?|Opening Line|Visual Ideas?|Blueprint|Remix):\s*/i, '');
}

function getCollectionIdsByItem(links) {
  return links.reduce((accumulator, link) => {
    if (!accumulator[link.content_item_id]) {
      accumulator[link.content_item_id] = [];
    }

    accumulator[link.content_item_id].push(link.collection_id);
    return accumulator;
  }, {});
}

function CollectionManager({
  collections,
  isOpen,
  isSaving,
  mode,
  selectedCollectionIds,
  newCollectionName,
  onClose,
  onToggleCollection,
  onNewCollectionNameChange,
  onSave,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'bulk' ? 'Add to Collection' : 'Save to Collection'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Organize your saved content into campaign-ready groups.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {collections.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
              No collections yet. Create one below.
            </div>
          )}

          {collections.map((collection) => {
            const isSelected = selectedCollectionIds.includes(collection.id);

            return (
              <button
                key={collection.id}
                type="button"
                onClick={() => onToggleCollection(collection.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                  isSelected
                    ? 'border-huttle-primary bg-huttle-primary/5 text-huttle-primary'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div>
                  <p className="font-medium">{collection.name}</p>
                  <p className="text-xs text-gray-400">{collection.count} items</p>
                </div>
                <span className={`flex h-5 w-5 items-center justify-center rounded border ${isSelected ? 'border-huttle-primary bg-huttle-primary text-white' : 'border-gray-300 bg-white'}`}>
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 border-t border-gray-100 pt-5">
          <label className="mb-2 block text-sm font-medium text-gray-700">Create new collection</label>
          <input
            value={newCollectionName}
            onChange={(event) => onNewCollectionNameChange(event.target.value)}
            placeholder="March Campaign"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
          />
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-huttle-primary px-4 py-3 text-sm font-medium text-white transition-all hover:bg-huttle-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const CREATE_POST_PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'x', label: 'X' },
  { id: 'facebook', label: 'Facebook' },
];

const KIT_PLATFORM_FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'twitter', label: 'X / Twitter' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'facebook', label: 'Facebook' },
];

function CreatePostModal({ isOpen, isSaving, onClose, onSaveToVault, onSaveAndSchedule }) {
  const [postContent, setPostContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [plannedDate, setPlannedDate] = useState('');
  const [tags, setTags] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
    if (!isOpen) {
      setPostContent('');
      setSelectedPlatforms([]);
      setPlannedDate('');
      setTags('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const togglePlatform = (platformId) => {
    setSelectedPlatforms((current) =>
      current.includes(platformId)
        ? current.filter((id) => id !== platformId)
        : [...current, platformId]
    );
  };

  const formData = { postContent, selectedPlatforms, plannedDate, tags };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4 backdrop-blur-sm" data-testid="vault-create-post-modal">
      <div className="w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Create Post</h3>
            <p className="mt-0.5 text-sm text-gray-500">Save a post idea directly to your vault</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <textarea
              ref={textareaRef}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={5}
              placeholder="Write your post..."
              className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none transition-all focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20 placeholder:text-gray-400"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Platform(s)</p>
            <div className="flex flex-wrap gap-2">
              {CREATE_POST_PLATFORMS.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => togglePlatform(platform.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-huttle-primary text-white border-huttle-primary'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {platform.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <Calendar className="inline w-3 h-3 mr-1" />
                Planned date
              </label>
              <input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Tags / labels
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. launch, product"
                className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20 placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!postContent.trim() || isSaving}
            onClick={() => onSaveToVault(formData)}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-huttle-primary/30 bg-white px-4 py-3 text-sm font-medium text-huttle-primary transition-all hover:bg-huttle-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
            Save to Vault
          </button>
          <button
            type="button"
            disabled={!postContent.trim() || isSaving}
            onClick={() => onSaveAndSchedule(formData)}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-huttle-primary px-4 py-3 text-sm font-medium text-white transition-all hover:bg-huttle-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
            Save & Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContentLibrary() {
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [items, setItems] = useState([]);
  const [collections, setCollections] = useState([]);
  const [collectionLinks, setCollectionLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [activeCollectionId, setActiveCollectionId] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [activeItemId, setActiveItemId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateCollectionField, setShowCreateCollectionField] = useState(false);
  const [createCollectionName, setCreateCollectionName] = useState('');
  const [collectionManager, setCollectionManager] = useState({
    isOpen: false,
    mode: 'single',
    itemIds: [],
    selectedCollectionIds: [],
    newCollectionName: '',
    isSaving: false,
  });
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isCreatePostSaving, setIsCreatePostSaving] = useState(false);
  const [vaultMainTab, setVaultMainTab] = useState('library');
  const [kits, setKits] = useState([]);
  const [kitsLoading, setKitsLoading] = useState(false);
  const [kitPlatformFilter, setKitPlatformFilter] = useState('all');
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef(null);
  const [kitDeleteTarget, setKitDeleteTarget] = useState(null);
  const [kitDeleteLoading, setKitDeleteLoading] = useState(false);
  const [copiedIds, setCopiedIds] = useState(new Set());
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    if (!createMenuOpen) return;
    const handlePointerDown = (event) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target)) {
        setCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [createMenuOpen]);

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const loadCollections = useCallback(async (currentUserId) => {
    const collectionsResult = await getContentCollections(currentUserId);

    if (!collectionsResult.success) {
      addToast('Failed to load collections', 'error');
      return;
    }

    const collectionRows = (collectionsResult.data || []).filter(
      (collection) => !isHiddenVaultCollectionName(collection.name),
    );
    const collectionIds = collectionRows.map((collection) => collection.id);
    const linksResult = await getContentCollectionItems(collectionIds);

    if (!linksResult.success) {
      addToast('Failed to load collection items', 'error');
      return;
    }

    const counts = (linksResult.data || []).reduce((accumulator, link) => {
      accumulator[link.collection_id] = (accumulator[link.collection_id] || 0) + 1;
      return accumulator;
    }, {});

    setCollections(collectionRows.map((collection) => ({
      ...collection,
      count: counts[collection.id] || 0,
    })));
    setCollectionLinks(linksResult.data || []);
  }, [addToast]);

  const loadVault = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setCollections([]);
      setCollectionLinks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const itemsResult = await getContentLibraryItems(user.id, { limit: 500 });

      if (!itemsResult.success) {
        console.error('[ContentVault] fetch error:', itemsResult.error);
        throw new Error(itemsResult.error || 'Failed to load content');
      }

      const rows = itemsResult.data ?? [];
      setItems(rows);
      await loadCollections(user.id);
    } catch (error) {
      console.error('[ContentVault] load failed:', error);
      addToast('Failed to load Content Vault', 'error');
      setItems([]);
      setCollections([]);
      setCollectionLinks([]);
    } finally {
      setLoading(false);
    }
  }, [addToast, loadCollections, user?.id]);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  useEffect(() => {
    if (activeCollectionId === 'all') return;
    if (!collections.some((collection) => collection.id === activeCollectionId)) {
      setActiveCollectionId('all');
    }
  }, [activeCollectionId, collections]);

  useEffect(() => {
    const onVaultUpdated = () => {
      if (user?.id) void loadVault();
    };
    window.addEventListener(CONTENT_VAULT_UPDATED_EVENT, onVaultUpdated);
    return () => window.removeEventListener(CONTENT_VAULT_UPDATED_EVENT, onVaultUpdated);
  }, [user?.id, loadVault]);

  const loadKits = useCallback(async () => {
    if (!user?.id) {
      setKits([]);
      setKitsLoading(false);
      return;
    }

    setKitsLoading(true);
    try {
      const result = await getUserKits(user.id);
      if (!result.success) {
        addToast('Failed to load post kits', 'error');
        setKits([]);
        return;
      }
      setKits(result.data || []);
    } catch (error) {
      console.error('Error loading post kits:', error);
      addToast('Failed to load post kits', 'error');
      setKits([]);
    } finally {
      setKitsLoading(false);
    }
  }, [addToast, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (vaultMainTab !== 'kits') return;
    loadKits();
  }, [user?.id, vaultMainTab, loadKits]);

  useEffect(() => {
    if (vaultMainTab !== 'library') {
      setActiveItemId(null);
    }
  }, [vaultMainTab]);

  const kitCountsByPlatform = useMemo(() => {
    const counts = { all: kits.length };
    KIT_PLATFORM_FILTER_TABS.forEach((tab) => {
      if (tab.id === 'all') return;
      counts[tab.id] = kits.filter((k) => k.platform === tab.id).length;
    });
    return counts;
  }, [kits]);

  const filteredKits = useMemo(() => {
    if (kitPlatformFilter === 'all') return kits;
    return kits.filter((k) => k.platform === kitPlatformFilter);
  }, [kits, kitPlatformFilter]);

  const handleConfirmDeleteKit = async () => {
    if (!kitDeleteTarget?.id || !user?.id) return;
    setKitDeleteLoading(true);
    const res = await deleteKit(kitDeleteTarget.id, user.id);
    setKitDeleteLoading(false);
    if (!res.success) {
      addToast(res.error || 'Could not delete post kit', 'error');
      return;
    }
    setKitDeleteTarget(null);
    addToast('Post kit deleted', 'success');
    void loadKits();
  };

  const collectionIdsByItem = useMemo(() => getCollectionIdsByItem(collectionLinks), [collectionLinks]);

  const vaultItems = useMemo(() => {
    return items
      .filter(isVaultRow)
      .map((item) => mapContentRowToVaultItem(item, collectionIdsByItem[item.id] || []));
  }, [collectionIdsByItem, items]);

  const activeItem = useMemo(() => {
    return vaultItems.find((item) => item.id === activeItemId) || null;
  }, [activeItemId, vaultItems]);

  const selectedItems = useMemo(() => {
    return vaultItems.filter((item) => selectedIds.includes(item.id));
  }, [selectedIds, vaultItems]);

  useEffect(() => {
    setEditedText(activeItem?.contentText || '');
    setIsEditing(false);
  }, [activeItem]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase();

    const nextItems = vaultItems.filter((item) => {
      const matchesType = selectedType === 'all' || item.contentType === selectedType;
      const matchesPlatform = selectedPlatform === 'all' || item.platform === selectedPlatform;
      const matchesCollection = activeCollectionId === 'all' || item.collectionIds.includes(activeCollectionId);
      const matchesSearch = !normalizedQuery || [
        item.contentText,
        item.topic,
        item.platform,
        item.name,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery));

      return matchesType && matchesPlatform && matchesCollection && matchesSearch;
    });

    if (selectedSort === 'oldest') {
      return [...nextItems].sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
    }

    if (selectedSort === 'most_used') {
      return [...nextItems].sort((left, right) => right.copyCount - left.copyCount || new Date(right.createdAt) - new Date(left.createdAt));
    }

    return [...nextItems].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  }, [activeCollectionId, searchQuery, selectedPlatform, selectedSort, selectedType, vaultItems]);

  const updateLocalItem = (itemId, updater) => {
    setItems((currentItems) => currentItems.map((item) => (
      item.id === itemId ? updater(item) : item
    )));
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setSelectedType('all');
    setSelectedPlatform('all');
    setSelectedSort('newest');
    setActiveCollectionId('all');
  };

  const toggleSelected = (itemId) => {
    setSelectedIds((currentIds) => (
      currentIds.includes(itemId)
        ? currentIds.filter((id) => id !== itemId)
        : [...currentIds, itemId]
    ));
  };

  const toggleExpanded = (itemId) => {
    setExpandedIds((currentIds) => (
      currentIds.includes(itemId)
        ? currentIds.filter((id) => id !== itemId)
        : [...currentIds, itemId]
    ));
  };

  const copyOne = async (item, options = {}) => {
    try {
      if (!options.skipClipboardWrite) {
        await navigator.clipboard.writeText(item.contentText || '');
      }

      const nextCopyHistory = [new Date().toISOString(), ...(item.copyHistory || [])].slice(0, 20);
      const nextMetadata = {
        ...item.metadata,
        copy_count: item.copyCount + 1,
        copy_history: nextCopyHistory,
      };

      updateLocalItem(item.id, (currentItem) => ({
        ...currentItem,
        metadata: nextMetadata,
      }));

      await updateContentLibraryItem(item.id, { metadata: nextMetadata }, user.id);

      if (options.toastMessage) {
        addToast(options.toastMessage, 'success');
      }
    } catch (error) {
      console.error('Failed to copy content:', error);
      addToast('Failed to copy content', 'error');
    }
  };

  const handleCopyItem = async (item) => {
    await copyOne(item, { toastMessage: 'Copied to clipboard ✓' });
  };

  const handleCopySelected = async () => {
    if (selectedItems.length === 0) return;

    const combinedText = selectedItems.map((item) => item.contentText).filter(Boolean).join('\n\n');

    try {
      await navigator.clipboard.writeText(combinedText);
      await Promise.all(selectedItems.map((item) => copyOne(item, { skipClipboardWrite: true })));
      addToast('Copied!', 'success');
    } catch (error) {
      console.error('Failed to copy selected items:', error);
      addToast('Failed to copy selected items', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!activeItem || !user?.id) return;

    try {
      const trimmedContent = editedText.trim();
      const result = await updateContentLibraryItem(activeItem.id, {
        content: trimmedContent,
        updated_at: new Date().toISOString(),
      }, user.id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save');
      }

      updateLocalItem(activeItem.id, (currentItem) => ({
        ...currentItem,
        content: trimmedContent,
        updated_at: new Date().toISOString(),
      }));
      addToast('Changes saved', 'success');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update vault item:', error);
      addToast('Failed to save changes', 'error');
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget || !user?.id) return;

    setIsDeleting(true);

    try {
      const idsToDelete = deleteTarget.bulk ? [...selectedIds] : [deleteTarget.id];

      await Promise.all(idsToDelete.map(async (itemId) => {
        const result = await deleteContentLibraryItem(itemId, user.id);

        if (!result.success) {
          throw new Error(result.error || 'Failed to delete');
        }
      }));

      setItems((currentItems) => currentItems.filter((item) => !idsToDelete.includes(item.id)));
      setSelectedIds((currentIds) => currentIds.filter((id) => !idsToDelete.includes(id)));
      if (idsToDelete.includes(activeItemId)) {
        setActiveItemId(null);
      }
      setDeleteTarget(null);
      addToast('Content deleted', 'success');
    } catch (error) {
      console.error('Failed to delete content:', error);
      addToast('Failed to delete content', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const openCollectionManager = (itemIds, mode = 'single') => {
    const firstItem = vaultItems.find((item) => item.id === itemIds[0]);

    setCollectionManager({
      isOpen: true,
      mode,
      itemIds,
      selectedCollectionIds: mode === 'single' ? [...(firstItem?.collectionIds || [])] : [],
      newCollectionName: '',
      isSaving: false,
    });
  };

  const closeCollectionManager = () => {
    setCollectionManager({
      isOpen: false,
      mode: 'single',
      itemIds: [],
      selectedCollectionIds: [],
      newCollectionName: '',
      isSaving: false,
    });
  };

  const handleSaveCollections = async () => {
    if (!user?.id) return;

    setCollectionManager((currentState) => ({ ...currentState, isSaving: true }));

    try {
      let nextCollectionIds = [...collectionManager.selectedCollectionIds];

      if (collectionManager.newCollectionName.trim()) {
        const createdCollection = await createContentCollection(user.id, collectionManager.newCollectionName.trim());

        if (!createdCollection.success) {
          throw new Error(createdCollection.error || 'Failed to create collection');
        }

        nextCollectionIds = [...nextCollectionIds, createdCollection.data.id];
      }

      if (collectionManager.mode === 'single') {
        const [itemId] = collectionManager.itemIds;
        const result = await setContentItemCollections(user.id, itemId, nextCollectionIds);

        if (!result.success) {
          throw new Error(result.error || 'Failed to update collections');
        }
      } else if (nextCollectionIds.length > 0) {
        await Promise.all(nextCollectionIds.map(async (collectionId) => {
          const result = await addItemsToCollection(user.id, collectionId, collectionManager.itemIds);

          if (!result.success) {
            throw new Error(result.error || 'Failed to add items to collection');
          }
        }));
      }

      await loadCollections(user.id);
      closeCollectionManager();
      addToast('Collections updated', 'success');
    } catch (error) {
      console.error('Failed to save collections:', error);
      addToast('Failed to update collections', 'error');
      setCollectionManager((currentState) => ({ ...currentState, isSaving: false }));
    }
  };

  const handleCreateCollectionChip = async () => {
    if (!user?.id || !createCollectionName.trim()) return;

    try {
      const result = await createContentCollection(user.id, createCollectionName.trim());

      if (!result.success) {
        throw new Error(result.error || 'Failed to create collection');
      }

      setCreateCollectionName('');
      setShowCreateCollectionField(false);
      await loadCollections(user.id);
      addToast('Collection created', 'success');
    } catch (error) {
      console.error('Failed to create collection:', error);
      addToast('Failed to create collection', 'error');
    }
  };

  const handleSavePost = async ({ postContent, selectedPlatforms, plannedDate, tags }, options = {}) => {
    if (!user?.id || !postContent.trim()) return;

    setIsCreatePostSaving(true);
    try {
      const primaryPlatform = selectedPlatforms[0] || null;
      const topicValue = tags.trim() || null;
      const metadata = {
        content_type: 'manual_post',
        tool_source: 'manual',
        tool_label: 'Manual post',
        source: 'manual',
        platform: primaryPlatform || '',
        platforms: selectedPlatforms,
        planned_date: plannedDate || null,
        topic: topicValue || '',
        tags: tags.trim() ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        copy_count: 0,
      };

      const result = await saveToVault(user.id, {
        name: 'Manual Post',
        content: postContent.trim(),
        type: 'text',
        platform: primaryPlatform,
        topic: topicValue,
        tool_source: 'manual',
        metadata,
      });

      if (!result.success) throw new Error(result.error || 'Failed to save');

      setIsCreatePostOpen(false);
      addToast('Post saved to vault ✓', 'success');
      await loadVault();

      if (options.scheduleAfter && plannedDate) {
        navigate(`/dashboard/calendar?date=${plannedDate}`);
      }
    } catch (error) {
      console.error('Failed to save manual post:', error);
      addToast('Failed to save post', 'error');
    } finally {
      setIsCreatePostSaving(false);
    }
  };

  const handleCardCopy = async (event, item) => {
    event.stopPropagation();
    await handleCopyItem(item);
    setCopiedIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    setTimeout(() => {
      setCopiedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 2000);
  };

  const hasNoVaultItems = !loading && vaultItems.length === 0;
  const hasNoResults = !loading && vaultItems.length > 0 && filteredItems.length === 0;

  return (
    <div className="min-h-screen flex-1 overflow-x-hidden bg-[#f7f8fa] px-4 pt-14 sm:px-6 md:ml-12 lg:ml-64 lg:px-8 lg:pt-20 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-7xl">

        {/* ── PAGE HEADER — matches all other pages ── */}
        <div className="pt-6 md:pt-0 mb-6 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 flex-shrink-0">
              <FolderOpen className="w-6 h-6 md:w-7 md:h-7 text-huttle-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">Content Vault</h1>
              <p className="text-sm md:text-base text-gray-500">Your saved AI content</p>
            </div>
          </div>
        </div>

        {/* ── ACTION BAR — search + button + view tabs ── */}
        {/* overflow-visible: menu not clipped. z-30: whole bar above sticky filters (z-20). Inner z-50/10: menu above vault tabs row. */}
        <div className="relative z-30 mb-4 overflow-visible rounded-2xl border border-gray-100 bg-white">
          {/* Search + New content */}
          <div className="relative z-50 flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-gray-100">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search captions, hooks, topics..."
                className="w-full h-10 pl-9 pr-4 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100 bg-white"
              />
            </div>
            <div className="relative shrink-0" ref={createMenuRef}>
              <button
                type="button"
                data-testid="vault-create-post-button"
                onClick={() => setCreateMenuOpen((open) => !open)}
                className="h-10 w-10 sm:w-auto sm:px-4 text-sm font-medium text-white bg-huttle-primary rounded-xl hover:bg-huttle-primary-dark transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New content</span>
              </button>
              {createMenuOpen && (
                <div className="absolute right-0 z-[60] mt-2 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white py-1 shadow-xl" role="menu" aria-label="Create content options">
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="vault-write-post-manually"
                    onClick={() => { setIsCreatePostOpen(true); setCreateMenuOpen(false); }}
                    className="flex w-full items-center gap-3 bg-gradient-to-r from-cyan-50/90 to-white px-4 py-3.5 text-left text-sm font-semibold text-gray-900 transition-colors hover:from-cyan-50 hover:to-cyan-50/60"
                  >
                    <Edit3 className="h-4 w-4 shrink-0 text-[#01BAD2]" />
                    <span>Write post manually</span>
                  </button>
                  <div className="mx-2 border-t border-gray-100" aria-hidden />
                  <Link to="/dashboard/ai-tools?tab=captions" onClick={() => setCreateMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-800 transition-colors hover:bg-gray-50">
                    <MessageSquare className="h-4 w-4 shrink-0 text-[#01BAD2]" /> <span>New Caption</span>
                  </Link>
                  <Link to="/dashboard/ai-tools?tab=hashtags" onClick={() => setCreateMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-800 transition-colors hover:bg-gray-50">
                    <Hash className="h-4 w-4 shrink-0 text-[#01BAD2]" /> <span>New Hashtags</span>
                  </Link>
                  <Link to="/dashboard/ai-tools?tab=hooks" onClick={() => setCreateMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-800 transition-colors hover:bg-gray-50">
                    <Zap className="h-4 w-4 shrink-0 text-[#01BAD2]" /> <span>New Hook</span>
                  </Link>
                  <Link to="/dashboard/full-post-builder" onClick={() => setCreateMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-800 transition-colors hover:bg-gray-50">
                    <FileText className="h-4 w-4 shrink-0 text-[#01BAD2]" /> <span>Build Full Post</span>
                  </Link>
                  <Link
                    to="/dashboard/post-kit/new"
                    onClick={() => {
                      setCreateMenuOpen(false);
                      try {
                        localStorage.removeItem(POSTKIT_PENDING_STORAGE_KEY);
                      } catch {
                        /* ignore */
                      }
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-800 transition-colors hover:bg-gray-50"
                  >
                    <Layers className="h-4 w-4 shrink-0 text-[#01BAD2]" /> <span>Build Post Kit</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* View toggle tabs — below search row in paint order; keep z lower than New content menu */}
          <div className="relative z-10 px-4 sm:px-5 flex items-center gap-6 bg-white">
            <button
              type="button"
              onClick={() => setVaultMainTab('library')}
              className={`h-10 text-sm relative transition-colors ${
                vaultMainTab === 'library'
                  ? 'text-gray-900 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-cyan-400'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              All saved content
            </button>
            <button
              type="button"
              onClick={() => setVaultMainTab('kits')}
              className={`h-10 text-sm relative transition-colors ${
                vaultMainTab === 'kits'
                  ? 'text-gray-900 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-cyan-400'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Post kits
            </button>
          </div>
        </div>

        {/* ── POST KITS TAB ── */}
        {vaultMainTab === 'kits' && (
          <div className="mb-6 space-y-4">
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2">
                {KIT_PLATFORM_FILTER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setKitPlatformFilter(tab.id)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      kitPlatformFilter === tab.id
                        ? 'bg-huttle-primary text-white shadow-sm'
                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}{' '}
                    <span className="opacity-80">({kitCountsByPlatform[tab.id] ?? 0})</span>
                  </button>
                ))}
              </div>
            </div>

            {kitsLoading && (
              <div className="flex items-center justify-center rounded-[28px] border border-gray-200 bg-white px-6 py-24 shadow-sm">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-huttle-primary" />
                  <p className="mt-4 text-sm text-gray-500">Loading post kits…</p>
                </div>
              </div>
            )}

            {!kitsLoading && filteredKits.length === 0 && (
              <div className="rounded-[28px] border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-huttle-primary/10 text-huttle-primary">
                  <Layers className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">No post kits yet</h3>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">
                  Create your first one to start organizing your content.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem(POSTKIT_PENDING_STORAGE_KEY, JSON.stringify({ platform: null, topic: null }));
                    } catch {
                      /* ignore */
                    }
                    navigate('/dashboard/post-kit/new');
                  }}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-huttle-primary px-5 py-3 text-sm font-medium text-white transition-all hover:bg-huttle-primary-dark"
                >
                  <Plus className="h-4 w-4" />
                  Create post kit
                </button>
              </div>
            )}

            {!kitsLoading && filteredKits.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
                {filteredKits.map((kit) => (
                  <PostKitCard
                    key={kit.id}
                    kit={kit}
                    onSelect={() => navigate(`/dashboard/post-kit/${kit.id}`)}
                    onRequestDelete={(k) => setKitDeleteTarget(k)}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem(POSTKIT_PENDING_STORAGE_KEY, JSON.stringify({ platform: null, topic: null }));
                    } catch {
                      /* ignore */
                    }
                    navigate('/dashboard/post-kit/new');
                  }}
                  className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-gray-300 bg-white/60 px-5 py-8 text-center text-sm font-semibold text-gray-600 transition-all hover:border-huttle-primary/50 hover:text-huttle-primary"
                >
                  <Plus className="h-6 w-6" />
                  New post kit
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── LIBRARY TAB ── */}
        {vaultMainTab === 'library' && (
          <>
            {/* Sticky filter bar */}
            <div className="sticky top-[56px] sm:top-16 lg:top-20 z-20 mb-3 rounded-2xl border border-gray-100 bg-white">
              {/* Type filter tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-2">
                <div className="flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {CONTENT_TYPE_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      data-testid={`vault-filter-${filter.id}`}
                      onClick={() => setSelectedType(filter.id)}
                      className={`h-10 sm:h-10 min-h-[44px] sm:min-h-0 whitespace-nowrap px-3 text-xs sm:text-sm relative transition-colors ${
                        selectedType === filter.id
                          ? 'text-gray-900 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-cyan-400'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Platform + Sort dropdowns */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 sm:shrink-0">
                  <select
                    value={selectedPlatform}
                    onChange={(event) => setSelectedPlatform(event.target.value)}
                    className="h-8 sm:h-8 min-h-[44px] sm:min-h-0 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100"
                  >
                    {PLATFORM_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>

                  <select
                    value={selectedSort}
                    onChange={(event) => setSelectedSort(event.target.value)}
                    className="h-8 sm:h-8 min-h-[44px] sm:min-h-0 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="most_used">Most Used</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Collections strip */}
            {collections.length > 0 && (
              <div className="mb-3 py-2">
                {/* Mobile: + New Collection above pills */}
                <div className="sm:hidden mb-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateCollectionField((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs text-cyan-500 font-medium"
                  >
                    <Plus className="h-3 w-3" /> New Collection
                  </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <button
                    type="button"
                    onClick={() => setActiveCollectionId('all')}
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-all min-h-[44px] sm:min-h-0 sm:py-1 ${
                      activeCollectionId === 'all'
                        ? 'bg-[var(--huttle-cyan)] text-white'
                        : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    All
                  </button>

                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() => setActiveCollectionId(collection.id)}
                      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-all min-h-[44px] sm:min-h-0 sm:py-1 ${
                        activeCollectionId === collection.id
                          ? 'bg-[var(--huttle-cyan)] text-white'
                          : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {collection.name}
                    </button>
                  ))}

                  {/* Desktop: + New Collection inline */}
                  <button
                    type="button"
                    onClick={() => setShowCreateCollectionField((v) => !v)}
                    className="hidden sm:inline-flex items-center gap-1 whitespace-nowrap text-xs text-cyan-500 font-medium shrink-0"
                  >
                    <Plus className="h-3 w-3" /> New Collection
                  </button>
                </div>

                {showCreateCollectionField && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={createCollectionName}
                      onChange={(event) => setCreateCollectionName(event.target.value)}
                      placeholder="Collection name"
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100"
                    />
                    <button type="button" onClick={handleCreateCollectionChip} className="text-sm font-medium text-cyan-600 hover:text-cyan-700">
                      Save
                    </button>
                    <button type="button" onClick={() => setShowCreateCollectionField(false)} className="text-sm text-gray-400 hover:text-gray-600">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Selection bar */}
            {selectedIds.length > 0 && (
              <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-[var(--huttle-cyan)] px-5 py-4 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-white">{selectedIds.length} items selected</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopySelected}
                    className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--huttle-cyan)] transition-all hover:bg-gray-100"
                  >
                    Copy All Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => openCollectionManager(selectedIds, 'bulk')}
                    className="rounded-full border border-white px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/10"
                  >
                    Add to Collection
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ id: selectedIds[0], name: `${selectedIds.length} selected items`, bulk: true })}
                    className="rounded-full border border-white px-4 py-2 text-sm font-medium text-[var(--tw-gradient-to)] transition-all"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-24">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                  <p className="mt-4 text-sm text-gray-400">Loading your saved content...</p>
                </div>
              </div>
            )}

            {/* Empty — vault is completely empty */}
            {hasNoVaultItems && (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <Inbox className="h-12 w-12 text-gray-300 sm:h-14 sm:w-14 lg:h-16 lg:w-16" />
                <h3 className="mt-4 text-base font-medium text-gray-500">No content here yet</h3>
                <p className="mt-1 text-sm text-gray-400">Your saved content will appear here.</p>
                <Link
                  to="/dashboard/ai-tools"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                >
                  <Sparkles className="h-4 w-4" />
                  Open AI Tools
                </Link>
              </div>
            )}

            {/* Empty — filters match nothing */}
            {hasNoResults && (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <Inbox className="h-12 w-12 text-gray-300 sm:h-14 sm:w-14 lg:h-16 lg:w-16" />
                <h3 className="mt-4 text-base font-medium text-gray-500">No content here yet</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {searchQuery
                    ? `No results for "${searchQuery}"`
                    : selectedType !== 'all'
                      ? `No ${(CONTENT_TYPE_CONFIG[selectedType]?.label || '').toLowerCase()} saved yet. Generate some in AI Tools.`
                      : 'Try a different search or clear your filters.'}
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* ── CARD GRID ── */}
            {!loading && filteredItems.length > 0 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                {filteredItems.map((item) => {
                  const contentConfig = CONTENT_TYPE_CONFIG[item.contentType] || CONTENT_TYPE_CONFIG.legacy;
                  const typeLabel = getContentTypeDisplayLabel(item.contentType);
                  const platformOption = getPlatformOption(item.platform);
                  const PlatformIcon = platformOption?.icon;
                  const isExpanded = expandedIds.includes(item.id);
                  const isSelected = selectedIds.includes(item.id);
                  const isCopied = copiedIds.has(item.id);
                  const cleanContent = stripContentLabel(item.contentText);

                  return (
                    <article
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveItemId(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setActiveItemId(item.id);
                        }
                      }}
                      className={`group flex flex-col bg-white rounded-2xl border border-gray-100 border-l-4 ${contentConfig.accentClass} transition-shadow hover:shadow-sm overflow-hidden ${
                        isExpanded ? '' : 'md:h-[160px]'
                      } ${isSelected ? 'ring-2 ring-cyan-300/40' : ''}`}
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1.5 shrink-0">
                        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                          {/* Selection checkbox */}
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); toggleSelected(item.id); }}
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                              isSelected
                                ? 'border-cyan-500 bg-cyan-500 text-white'
                                : 'border-gray-300 bg-white text-transparent opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <Check className="h-2.5 w-2.5" />
                          </button>

                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${contentConfig.badgeClass}`}>
                            {typeLabel}
                          </span>
                          <span className="text-gray-300 text-[11px]">·</span>
                          {PlatformIcon && <PlatformIcon className="h-3 w-3 text-gray-400 shrink-0 hidden sm:block" />}
                          <span className="text-gray-400 text-[11px] truncate hidden sm:inline">{platformOption?.label || 'Saved'}</span>
                          <span className="text-gray-300 text-[11px] hidden sm:inline">·</span>
                          <span className="text-gray-400 text-[11px] whitespace-nowrap">{formatDate(item.createdAt)}</span>
                        </div>

                        {/* ⋯ menu */}
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuId(openMenuId === item.id ? null : item.id);
                            }}
                            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 min-w-[28px] min-h-[28px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {openMenuId === item.id && (
                            <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                onClick={(event) => { handleCardCopy(event, item); setOpenMenuId(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                              >
                                <Copy className="h-3.5 w-3.5" /> Copy
                              </button>
                              <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); setActiveItemId(item.id); setIsEditing(true); setOpenMenuId(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                              >
                                <Edit3 className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); openCollectionManager([item.id], 'single'); setOpenMenuId(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                              >
                                <FolderPlus className="h-3.5 w-3.5" /> Add to Collection
                              </button>
                              <div className="my-1 border-t border-gray-100" />
                              <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); setDeleteTarget({ id: item.id, name: item.name || typeLabel }); setOpenMenuId(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="flex-1 min-h-0 overflow-hidden px-4">
                        <p className={`text-sm text-gray-700 leading-relaxed ${
                          isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-3 md:line-clamp-2'
                        }`}>
                          {cleanContent}
                        </p>
                        {cleanContent.length > 100 && (
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); toggleExpanded(item.id); }}
                            className="mt-0.5 text-xs text-cyan-500 hover:text-cyan-600 transition-colors"
                          >
                            {isExpanded ? 'Show less' : 'Show more'}
                          </button>
                        )}
                      </div>

                      {/* Card footer */}
                      <div className="flex items-center justify-between gap-2 px-4 pt-1.5 pb-3 shrink-0">
                        <div className="min-w-0">
                          {item.topic && (
                            <span className="inline-block max-w-[120px] sm:max-w-[180px] truncate rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs text-gray-500">
                              {item.topic}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(event) => handleCardCopy(event, item)}
                          className={`shrink-0 h-6 min-h-[40px] sm:min-h-0 sm:h-6 px-3 text-xs font-medium rounded-lg border transition-all ${
                            isCopied
                              ? 'border-cyan-400 bg-cyan-50 text-cyan-600'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {isCopied ? 'Copied ✓' : 'Copy'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>

      {/* ── DETAIL DRAWER ── */}
      {vaultMainTab === 'library' && activeItem && (
        <div
          className={`fixed inset-0 z-[60] ${isMobile ? 'bg-[#f7f8fa]' : 'bg-black/30 backdrop-blur-sm'}`}
          onClick={isMobile ? undefined : () => setActiveItemId(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className={`overflow-y-auto transition-all ${
              isMobile
                ? 'h-full w-full bg-[#f7f8fa]'
                : 'absolute right-0 top-0 h-full w-full max-w-xl border-l border-gray-200 bg-white shadow-2xl'
            }`}
          >
            <div className={`sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 px-6 py-4 backdrop-blur ${
              isMobile ? 'bg-[#f7f8fa]/95' : 'bg-white/95'
            }`}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Saved Content</p>
                <h2 className="mt-1 text-xl font-semibold text-gray-900">{activeItem.name || 'Content item'}</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveItemId(null)}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${(CONTENT_TYPE_CONFIG[activeItem.contentType] || CONTENT_TYPE_CONFIG.legacy).badgeClass}`}>
                  {getContentTypeDisplayLabel(activeItem.contentType)}
                </span>
                {activeItem.platform && (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    {getPlatformOption(activeItem.platform)?.label || activeItem.platform}
                  </span>
                )}
              </div>

              <div className="rounded-[24px] bg-gray-50 p-5">
                {isEditing ? (
                  <textarea
                    value={editedText}
                    onChange={(event) => setEditedText(event.target.value)}
                    rows={isMobile ? 14 : 16}
                    className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[15px] leading-7 text-gray-800 outline-none focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-[15px] leading-7 text-gray-800">{activeItem.contentText}</p>
                )}
              </div>

              <div className="grid gap-4 rounded-[24px] border border-gray-200 bg-white p-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tool used</p>
                  <p className="mt-1 text-sm text-gray-700">{activeItem.toolLabel || humanizeToolSource(activeItem.toolSource)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Platform</p>
                  <p className="mt-1 text-sm text-gray-700">{getPlatformOption(activeItem.platform)?.label || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Date</p>
                  <p className="mt-1 text-sm text-gray-700">{formatDate(activeItem.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Topic</p>
                  <p className="mt-1 text-sm text-gray-700">{activeItem.topic || 'Not set'}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-huttle-primary px-4 py-3 text-sm font-medium text-white transition-all hover:bg-huttle-primary-dark"
                    >
                      <Check className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedText(activeItem.contentText);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCopyItem(activeItem)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-huttle-primary px-4 py-3 text-sm font-medium text-white transition-all hover:bg-huttle-primary-dark"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openCollectionManager([activeItem.id], 'single')}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
                    >
                      <FolderPlus className="h-4 w-4" />
                      Add to Collection
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: activeItem.id, name: activeItem.name || 'Content item' })}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 px-4 py-3 text-sm font-medium text-red-500 transition-all hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>

              {!isEditing && (
                <button
                  type="button"
                  onClick={() => navigate(buildUseAgainTarget(activeItem))}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-gray-800"
                >
                  <Sparkles className="h-4 w-4" />
                  Use Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <CreatePostModal
        isOpen={isCreatePostOpen}
        isSaving={isCreatePostSaving}
        onClose={() => setIsCreatePostOpen(false)}
        onSaveToVault={(formData) => handleSavePost(formData)}
        onSaveAndSchedule={(formData) => handleSavePost(formData, { scheduleAfter: true })}
      />

      <CollectionManager
        collections={collections}
        isOpen={collectionManager.isOpen}
        isSaving={collectionManager.isSaving}
        mode={collectionManager.mode}
        selectedCollectionIds={collectionManager.selectedCollectionIds}
        newCollectionName={collectionManager.newCollectionName}
        onClose={closeCollectionManager}
        onToggleCollection={(collectionId) => {
          setCollectionManager((currentState) => ({
            ...currentState,
            selectedCollectionIds: currentState.selectedCollectionIds.includes(collectionId)
              ? currentState.selectedCollectionIds.filter((id) => id !== collectionId)
              : [...currentState.selectedCollectionIds, collectionId],
          }));
        }}
        onNewCollectionNameChange={(value) => {
          setCollectionManager((currentState) => ({
            ...currentState,
            newCollectionName: value,
          }));
        }}
        onSave={handleSaveCollections}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteItem}
        title="Delete Content"
        message={deleteTarget?.bulk ? 'Delete these selected items? This cannot be undone.' : "Delete this content? This can't be undone."}
        itemName={deleteTarget?.name}
        type="content"
        isDeleting={isDeleting}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(kitDeleteTarget)}
        onClose={() => !kitDeleteLoading && setKitDeleteTarget(null)}
        onConfirm={() => void handleConfirmDeleteKit()}
        title="Delete post kit?"
        message="This permanently deletes this post kit and everything saved in its slots."
        itemName={kitDeleteTarget?.title || ''}
        type="post_kit"
        isDeleting={kitDeleteLoading}
      />
    </div>
  );
}
