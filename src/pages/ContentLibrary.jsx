import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  Copy,
  Edit3,
  FolderPlus,
  Layers,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useIsMobile } from '../hooks/useIsMobile';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import PostKitCard from '../components/PostKitCard';
import PostKitCreateModal from '../components/PostKitCreateModal';
import PostKitDetail from '../components/PostKitDetail';
import {
  addItemsToCollection,
  createContentCollection,
  deleteContentLibraryItem,
  getContentCollectionItems,
  getContentCollections,
  getContentLibraryItems,
  saveContentLibraryItem,
  setContentItemCollections,
  updateContentLibraryItem,
} from '../config/supabase';
import {
  buildUseAgainTarget,
  CONTENT_TYPE_CONFIG,
  CONTENT_TYPE_FILTERS,
  countCopiesThisWeek,
  getPlatformOption,
  humanizeToolSource,
  isVaultRow,
  mapContentRowToVaultItem,
  PLATFORM_OPTIONS,
} from '../utils/contentVault';
import { getUserKits } from '../services/postKitService';

function formatDate(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function getPreviewText(item, isExpanded) {
  if (!item.contentText) return '';
  if (item.contentText.length <= 300 || isExpanded) return item.contentText;
  return `${item.contentText.slice(0, 200).trim()}...`;
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
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
];

const KIT_PLATFORM_FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'twitter', label: 'X / Twitter' },
  { id: 'linkedin', label: 'LinkedIn' },
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

function EmptyState({ hasContent, onClearFilters, onCreate, onCreateManual }) {
  return (
    <div className="rounded-[28px] border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-huttle-primary/10 text-huttle-primary">
        {hasContent ? <Search className="h-7 w-7" /> : <Wand2 className="h-7 w-7" />}
      </div>
      <h3 className="text-2xl font-semibold text-gray-900">
        {hasContent ? 'No matches found' : 'Your vault is empty'}
      </h3>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">
        {hasContent
          ? 'Try a different search or clear your filters.'
          : "Save content from any AI tool and it'll appear here, ready to copy and post."}
      </p>
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={hasContent ? onClearFilters : onCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-huttle-primary px-5 py-3 text-sm font-medium text-white transition-all hover:bg-huttle-primary-dark"
        >
          {hasContent ? 'Clear Filters' : 'Generate with AI'}
        </button>
        {!hasContent && (
          <button
            type="button"
            onClick={onCreateManual}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            Write a Post Manually
          </button>
        )}
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
  const [vaultMainTab, setVaultMainTab] = useState('kits');
  const [kits, setKits] = useState([]);
  const [kitsLoading, setKitsLoading] = useState(false);
  const [selectedKitId, setSelectedKitId] = useState(null);
  const [kitPlatformFilter, setKitPlatformFilter] = useState('all');
  const [showPostKitCreate, setShowPostKitCreate] = useState(false);

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

    const collectionRows = collectionsResult.data || [];
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
        throw new Error(itemsResult.error || 'Failed to load content');
      }

      setItems(itemsResult.data || []);
      await loadCollections(user.id);
    } catch (error) {
      console.error('Error loading content vault:', error);
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
    if (vaultMainTab !== 'kits') {
      setSelectedKitId(null);
    }
  }, [vaultMainTab]);

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
      return nextItems.toSorted((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
    }

    if (selectedSort === 'most_used') {
      return nextItems.toSorted((left, right) => right.copyCount - left.copyCount || new Date(right.createdAt) - new Date(left.createdAt));
    }

    return nextItems.toSorted((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  }, [activeCollectionId, searchQuery, selectedPlatform, selectedSort, selectedType, vaultItems]);

  const stats = useMemo(() => {
    return {
      savedCount: vaultItems.length,
      copiedThisWeek: countCopiesThisWeek(vaultItems),
      inCollections: vaultItems.filter((item) => item.collectionIds.length > 0).length,
    };
  }, [vaultItems]);

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

      const result = await saveContentLibraryItem(user.id, {
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

  const hasNoVaultItems = !loading && vaultItems.length === 0;
  const hasNoResults = !loading && vaultItems.length > 0 && filteredItems.length === 0;

  return (
    <div className="min-h-screen flex-1 overflow-x-hidden bg-[#f7f8fa] px-4 pb-10 pt-14 sm:px-6 lg:ml-64 lg:px-8 lg:pt-20">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-4 rounded-[20px] border border-huttle-primary/20 bg-huttle-50/60 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            <Sparkles className="inline w-3.5 h-3.5 text-huttle-primary mr-1.5 -mt-0.5" />
            Want AI to help write this post?
          </p>
          <Link
            to="/dashboard/ai-tools"
            className="inline-flex items-center gap-1 text-sm font-semibold text-huttle-primary hover:text-huttle-primary-dark flex-shrink-0"
          >
            Try AI Power Tools <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="mb-6 rounded-[28px] border border-white/60 bg-white/70 px-5 py-6 shadow-sm backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Content Vault</h1>
              <p className="mt-1 text-sm text-gray-500">
                {vaultMainTab === 'kits' && !selectedKitId && 'Organize multi-part posts by platform.'}
                {vaultMainTab === 'kits' && selectedKitId && 'Edit slots and copy when you are ready to post.'}
                {vaultMainTab === 'library' && 'Your saved AI content'}
              </p>
            </div>
            <div className="inline-flex shrink-0 rounded-2xl border border-gray-200 bg-gray-50/80 p-1">
              <button
                type="button"
                onClick={() => setVaultMainTab('kits')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  vaultMainTab === 'kits' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Post kits
              </button>
              <button
                type="button"
                onClick={() => setVaultMainTab('library')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  vaultMainTab === 'library' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                All saved content
              </button>
            </div>
          </div>
        </div>

        {vaultMainTab === 'kits' && !selectedKitId && (
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
                  onClick={() => setShowPostKitCreate(true)}
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
                    onClick={() => setSelectedKitId(kit.id)}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setShowPostKitCreate(true)}
                  className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-gray-300 bg-white/60 px-5 py-8 text-center text-sm font-semibold text-gray-600 transition-all hover:border-huttle-primary/50 hover:text-huttle-primary"
                >
                  <Plus className="h-6 w-6" />
                  New post kit
                </button>
              </div>
            )}
          </div>
        )}

        {vaultMainTab === 'kits' && selectedKitId && (
          <div className="mb-6">
            <PostKitDetail
              kitId={selectedKitId}
              userId={user?.id}
              onBack={() => {
                setSelectedKitId(null);
                loadKits();
              }}
              onUpdated={loadKits}
            />
          </div>
        )}

        {vaultMainTab === 'library' && (
          <>
        <div className="mb-6 rounded-[28px] border border-white/60 bg-white/70 px-5 py-6 shadow-sm backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-gray-900">All saved content</h2>
              <p className="mt-1 text-sm text-gray-500">Captions, hooks, and items you saved from AI tools</p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="relative w-full sm:min-w-[300px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search captions, hooks, topics, or platforms..."
                  className="w-full rounded-2xl border border-gray-200 bg-white px-11 py-3 text-sm outline-none transition-all focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
                />
              </div>

              <button
                type="button"
                data-testid="vault-create-post-button"
                onClick={() => setIsCreatePostOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#01BAD2] px-4 py-3 text-sm font-medium text-white transition-all hover:opacity-95 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                + Create Post
              </button>

              <button
                type="button"
                onClick={handleCopySelected}
                disabled={selectedItems.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-huttle-primary px-4 py-3 text-sm font-medium text-white transition-all hover:bg-huttle-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Copy className="h-4 w-4" />
                Copy All
              </button>
            </div>
          </div>
        </div>

        <div className="sticky top-[72px] z-20 mb-4 rounded-[28px] border border-gray-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur sm:top-20 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CONTENT_TYPE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  data-testid={`vault-filter-${filter.id}`}
                  onClick={() => setSelectedType(filter.id)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    selectedType === filter.id
                      ? 'bg-huttle-primary text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedPlatform}
                onChange={(event) => setSelectedPlatform(event.target.value)}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
              >
                {PLATFORM_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedSort}
                onChange={(event) => setSelectedSort(event.target.value)}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-huttle-primary focus:ring-2 focus:ring-huttle-primary/20"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="most_used">Most Used</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
            <Sparkles className="h-4 w-4 text-huttle-primary" />
            <span>{stats.savedCount} items saved</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
            <Copy className="h-4 w-4 text-huttle-primary" />
            <span>{stats.copiedThisWeek} copied this week</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
            <Star className="h-4 w-4 text-huttle-primary" />
            <span>{stats.inCollections} in collections</span>
          </div>
        </div>

        <div className="mb-6 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCreateCollectionField((currentValue) => !currentValue)}
              className="rounded-full border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:border-huttle-primary hover:text-huttle-primary"
            >
              + New Collection
            </button>

            {showCreateCollectionField && (
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 shadow-sm">
                <input
                  value={createCollectionName}
                  onChange={(event) => setCreateCollectionName(event.target.value)}
                  placeholder="Collection name"
                  className="bg-transparent text-sm outline-none"
                />
                <button type="button" onClick={handleCreateCollectionChip} className="text-sm font-medium text-huttle-primary">
                  Save
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveCollectionId('all')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                activeCollectionId === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              All Collections
            </button>

            {collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => setActiveCollectionId(collection.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  activeCollectionId === collection.id
                    ? 'bg-huttle-primary text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {collection.name} {collection.count}
              </button>
            ))}
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="mb-5 flex flex-col gap-3 rounded-[24px] bg-gray-900 px-5 py-4 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">{selectedIds.length} items selected</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopySelected}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-all hover:bg-gray-100"
              >
                Copy All Selected
              </button>
              <button
                type="button"
                onClick={() => openCollectionManager(selectedIds, 'bulk')}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/10"
              >
                Add to Collection
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget({ id: selectedIds[0], name: `${selectedIds.length} selected items`, bulk: true })}
                className="rounded-full border border-red-400/30 px-4 py-2 text-sm font-medium text-red-200 transition-all hover:bg-red-500/10"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center rounded-[28px] border border-gray-200 bg-white px-6 py-24 shadow-sm">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-huttle-primary" />
              <p className="mt-4 text-sm text-gray-500">Loading your saved content...</p>
            </div>
          </div>
        )}

        {hasNoVaultItems && (
          <EmptyState
            hasContent={false}
            onClearFilters={resetFilters}
            onCreate={() => navigate('/dashboard/ai-tools')}
            onCreateManual={() => setIsCreatePostOpen(true)}
          />
        )}

        {hasNoResults && (
          <EmptyState
            hasContent
            onClearFilters={resetFilters}
            onCreate={() => navigate('/dashboard/ai-tools')}
            onCreateManual={() => setIsCreatePostOpen(true)}
          />
        )}

        {!loading && filteredItems.length > 0 && (
          <div className="columns-1 gap-5 md:columns-2">
            {filteredItems.map((item) => {
              const contentConfig = CONTENT_TYPE_CONFIG[item.contentType] || CONTENT_TYPE_CONFIG.legacy;
              const platformOption = getPlatformOption(item.platform);
              const PlatformIcon = platformOption?.icon;
              const isExpanded = expandedIds.includes(item.id);
              const isSelected = selectedIds.includes(item.id);

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
                  className={`group mb-5 break-inside-avoid rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${isSelected ? 'ring-2 ring-huttle-primary/30' : ''}`}
                >
                  <div className={`mb-4 flex items-start justify-between gap-3 border-l-4 pl-4 ${contentConfig.accentClass}`}>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSelected(item.id);
                        }}
                        className={`flex h-6 w-6 items-center justify-center rounded border transition-all ${
                          isSelected
                            ? 'border-huttle-primary bg-huttle-primary text-white'
                            : 'border-gray-300 bg-white text-transparent opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${contentConfig.badgeClass}`}>
                        {contentConfig.singular}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {PlatformIcon && <PlatformIcon className="h-3.5 w-3.5" />}
                      <span>{platformOption?.label || 'Saved'}</span>
                      <span>·</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="whitespace-pre-wrap text-[15px] leading-7 text-gray-800">
                      {getPreviewText(item, isExpanded)}
                    </p>

                    {item.contentText.length > 300 && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleExpanded(item.id);
                        }}
                        className="text-sm font-medium text-huttle-primary transition-colors hover:text-huttle-primary-dark"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}

                    <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                      {item.topic && <span className="rounded-full bg-gray-100 px-2.5 py-1">{item.topic}</span>}
                      <span className="rounded-full bg-gray-100 px-2.5 py-1">Copied {item.copyCount}x</span>
                      {item.collectionIds.length > 0 && (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1">{item.collectionIds.length} collections</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 opacity-100 transition-all md:opacity-0 md:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCopyItem(item);
                      }}
                      className="rounded-full border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveItemId(item.id);
                        setIsEditing(true);
                      }}
                      className="rounded-full border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openCollectionManager([item.id], 'single');
                      }}
                      className="rounded-full border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50"
                    >
                      Save to Collection
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteTarget({ id: item.id, name: item.name || contentConfig.singular });
                      }}
                      className="rounded-full border border-red-100 px-3 py-2 text-xs font-medium text-red-500 transition-all hover:bg-red-50"
                    >
                      Delete
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
                  {(CONTENT_TYPE_CONFIG[activeItem.contentType] || CONTENT_TYPE_CONFIG.legacy).singular}
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

      <PostKitCreateModal
        isOpen={showPostKitCreate}
        onClose={() => setShowPostKitCreate(false)}
        userId={user?.id}
        onCreated={() => loadKits()}
      />

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
    </div>
  );
}
