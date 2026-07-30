/**
 * @jest-environment jsdom
 */
import { render, act } from "@testing-library/react";
import { useInfiniteScrollSentinel } from "./useInfiniteScrollSentinel";

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observed: Element[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element) {
    this.observed.push(el);
  }

  unobserve() {}
  disconnect() {
    this.observed = [];
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  root = null;
  rootMargin = "";
  thresholds: number[] = [];

  trigger(isIntersecting: boolean) {
    const target = this.observed[0] ?? document.createElement("div");
    const entry = { isIntersecting, target } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

function Host({
  enabled,
  onLoadMore,
}: {
  enabled: boolean;
  onLoadMore: () => void;
}) {
  const ref = useInfiniteScrollSentinel({ enabled, onLoadMore });
  return <div ref={ref} data-testid="sentinel" />;
}

describe("useInfiniteScrollSentinel", () => {
  const OriginalObserver = global.IntersectionObserver;

  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    global.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    global.IntersectionObserver = OriginalObserver;
  });

  it("fires onLoadMore once when the sentinel intersects", () => {
    const onLoadMore = jest.fn();
    render(<Host enabled onLoadMore={onLoadMore} />);

    const observer = MockIntersectionObserver.instances.at(-1);
    expect(observer?.observed.length).toBe(1);

    act(() => {
      observer?.trigger(true);
      observer?.trigger(true);
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("does not observe when disabled", () => {
    const onLoadMore = jest.fn();
    render(<Host enabled={false} onLoadMore={onLoadMore} />);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("re-arms after becoming enabled again", () => {
    const onLoadMore = jest.fn();
    const { rerender } = render(<Host enabled onLoadMore={onLoadMore} />);

    act(() => {
      MockIntersectionObserver.instances.at(-1)?.trigger(true);
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender(<Host enabled={false} onLoadMore={onLoadMore} />);
    rerender(<Host enabled onLoadMore={onLoadMore} />);

    act(() => {
      MockIntersectionObserver.instances.at(-1)?.trigger(true);
    });
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });
});
