#pragma clang diagnostic ignored "-Wmissing-prototypes"

#include <metal_stdlib>
#include <simd/simd.h>

using namespace metal;

struct main0_out
{
    float FragColor [[color(0)]];
};

inline uint4 spvSubgroupBallot(bool value)
{
    simd_vote vote = simd_ballot(value);
    // simd_ballot() returns a 64-bit integer-like object, but
    // SPIR-V callers expect a uint4. We must convert.
    // FIXME: This won't include higher bits if Apple ever supports
    // 128 lanes in an SIMD-group.
    return uint4((uint)((simd_vote::vote_t)vote & 0xFFFFFFFF), (uint)(((simd_vote::vote_t)vote >> 32) & 0xFFFFFFFF), 0, 0);
}

inline bool spvSubgroupBallotBitExtract(uint4 ballot, uint bit)
{
    return !!extract_bits(ballot[bit / 32], bit % 32, 1);
}

inline uint spvSubgroupBallotFindLSB(uint4 ballot)
{
    return select(ctz(ballot.x), select(32 + ctz(ballot.y), select(64 + ctz(ballot.z), select(96 + ctz(ballot.w), uint(-1), ballot.w == 0), ballot.z == 0), ballot.y == 0), ballot.x == 0);
}

inline uint spvSubgroupBallotFindMSB(uint4 ballot)
{
    return select(128 - (clz(ballot.w) + 1), select(96 - (clz(ballot.z) + 1), select(64 - (clz(ballot.y) + 1), select(32 - (clz(ballot.x) + 1), uint(-1), ballot.x == 0), ballot.y == 0), ballot.z == 0), ballot.w == 0);
}

inline uint spvSubgroupBallotBitCount(uint4 ballot)
{
    return popcount(ballot.x) + popcount(ballot.y) + popcount(ballot.z) + popcount(ballot.w);
}

inline uint spvSubgroupBallotInclusiveBitCount(uint4 ballot, uint gl_SubgroupInvocationID)
{
    uint4 mask = uint4(extract_bits(0xFFFFFFFF, 0, min(gl_SubgroupInvocationID + 1, 32u)), extract_bits(0xFFFFFFFF, 0, (uint)max((int)gl_SubgroupInvocationID + 1 - 32, 0)), uint2(0));
    return spvSubgroupBallotBitCount(ballot & mask);
}

inline uint spvSubgroupBallotExclusiveBitCount(uint4 ballot, uint gl_SubgroupInvocationID)
{
    uint4 mask = uint4(extract_bits(0xFFFFFFFF, 0, min(gl_SubgroupInvocationID, 32u)), extract_bits(0xFFFFFFFF, 0, (uint)max((int)gl_SubgroupInvocationID - 32, 0)), uint2(0));
    return spvSubgroupBallotBitCount(ballot & mask);
}

template<typename T>
inline bool spvSubgroupAllEqual(T value)
{
    return simd_all(value == simd_broadcast_first(value));
}

template<>
inline bool spvSubgroupAllEqual(bool value)
{
    return simd_all(value) || !simd_any(value);
}

fragment main0_out main0()
{
    main0_out out = {};
    uint gl_SubgroupSize = simd_sum(1);
    uint gl_SubgroupInvocationID = simd_prefix_exclusive_sum(1);
    uint4 gl_SubgroupEqMask = gl_SubgroupInvocationID > 32 ? uint4(0, (1 << (gl_SubgroupInvocationID - 32)), uint2(0)) : uint4(1 << gl_SubgroupInvocationID, uint3(0));
    uint4 gl_SubgroupGeMask = uint4(extract_bits(0xFFFFFFFF, min(gl_SubgroupInvocationID, 32u), (uint)max(min((int)gl_SubgroupSize, 32) - (int)gl_SubgroupInvocationID, 0)), extract_bits(0xFFFFFFFF, (uint)max((int)gl_SubgroupInvocationID - 32, 0), (uint)max((int)gl_SubgroupSize - (int)max(gl_SubgroupInvocationID, 32u), 0)), uint2(0));
    uint4 gl_SubgroupGtMask = uint4(extract_bits(0xFFFFFFFF, min(gl_SubgroupInvocationID + 1, 32u), (uint)max(min((int)gl_SubgroupSize, 32) - (int)gl_SubgroupInvocationID - 1, 0)), extract_bits(0xFFFFFFFF, (uint)max((int)gl_SubgroupInvocationID + 1 - 32, 0), (uint)max((int)gl_SubgroupSize - (int)max(gl_SubgroupInvocationID + 1, 32u), 0)), uint2(0));
    uint4 gl_SubgroupLeMask = uint4(extract_bits(0xFFFFFFFF, 0, min(gl_SubgroupInvocationID + 1, 32u)), extract_bits(0xFFFFFFFF, 0, (uint)max((int)gl_SubgroupInvocationID + 1 - 32, 0)), uint2(0));
    uint4 gl_SubgroupLtMask = uint4(extract_bits(0xFFFFFFFF, 0, min(gl_SubgroupInvocationID, 32u)), extract_bits(0xFFFFFFFF, 0, (uint)max((int)gl_SubgroupInvocationID - 32, 0)), uint2(0));
    out.FragColor = float(gl_SubgroupSize);
    out.FragColor = float(gl_SubgroupInvocationID);
    bool elected = simd_is_first();
    out.FragColor = float4(gl_SubgroupEqMask).x;
    out.FragColor = float4(gl_SubgroupGeMask).x;
    out.FragColor = float4(gl_SubgroupGtMask).x;
    out.FragColor = float4(gl_SubgroupLeMask).x;
    out.FragColor = float4(gl_SubgroupLtMask).x;
    float4 broadcasted = simd_broadcast(float4(10.0), 8u);
    float3 first = simd_broadcast_first(float3(20.0));
    uint4 ballot_value = spvSubgroupBallot(true);
    bool inverse_ballot_value = spvSubgroupBallotBitExtract(ballot_value, gl_SubgroupInvocationID);
    bool bit_extracted = spvSubgroupBallotBitExtract(uint4(10u), 8u);
    uint bit_count = spvSubgroupBallotBitCount(ballot_value);
    uint inclusive_bit_count = spvSubgroupBallotInclusiveBitCount(ballot_value, gl_SubgroupInvocationID);
    uint exclusive_bit_count = spvSubgroupBallotExclusiveBitCount(ballot_value, gl_SubgroupInvocationID);
    uint lsb = spvSubgroupBallotFindLSB(ballot_value);
    uint msb = spvSubgroupBallotFindMSB(ballot_value);
    uint shuffled = simd_shuffle(10u, 8u);
    uint shuffled_xor = simd_shuffle_xor(30u, 8u);
    uint shuffled_up = simd_shuffle_up(20u, 4u);
    uint shuffled_down = simd_shuffle_down(20u, 4u);
    bool has_all = simd_all(true);
    bool has_any = simd_any(true);
    bool has_equal = spvSubgroupAllEqual(0);
    has_equal = spvSubgroupAllEqual(true);
    float4 added = simd_sum(float4(20.0));
    int4 iadded = simd_sum(int4(20));
    float4 multiplied = simd_product(float4(20.0));
    int4 imultiplied = simd_product(int4(20));
    float4 lo = simd_min(float4(20.0));
    float4 hi = simd_max(float4(20.0));
    int4 slo = simd_min(int4(20));
    int4 shi = simd_max(int4(20));
    uint4 ulo = simd_min(uint4(20u));
    uint4 uhi = simd_max(uint4(20u));
    uint4 anded = simd_and(ballot_value);
    uint4 ored = simd_or(ballot_value);
    uint4 xored = simd_xor(ballot_value);
    added = simd_prefix_inclusive_sum(added);
    iadded = simd_prefix_inclusive_sum(iadded);
    multiplied = simd_prefix_inclusive_product(multiplied);
    imultiplied = simd_prefix_inclusive_product(imultiplied);
    added = simd_prefix_exclusive_sum(multiplied);
    multiplied = simd_prefix_exclusive_product(multiplied);
    iadded = simd_prefix_exclusive_sum(imultiplied);
    imultiplied = simd_prefix_exclusive_product(imultiplied);
    added = quad_sum(added);
    multiplied = quad_product(multiplied);
    iadded = quad_sum(iadded);
    imultiplied = quad_product(imultiplied);
    lo = quad_min(lo);
    hi = quad_max(hi);
    ulo = quad_min(ulo);
    uhi = quad_max(uhi);
    slo = quad_min(slo);
    shi = quad_max(shi);
    anded = quad_and(anded);
    ored = quad_or(ored);
    xored = quad_xor(xored);
    float4 swap_horiz = quad_shuffle_xor(float4(20.0), 1u);
    float4 swap_vertical = quad_shuffle_xor(float4(20.0), 2u);
    float4 swap_diagonal = quad_shuffle_xor(float4(20.0), 3u);
    float4 quad_broadcast0 = quad_broadcast(float4(20.0), 3u);
    return out;
}

