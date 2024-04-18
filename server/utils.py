import re

class ParseException(Exception):
    pass

class NotFoundException(Exception):
    pass

def parse_chr(chr):
    chr = re.sub(r'^0', '', str(chr))
    return int(chr.lower().replace('chr', '').replace('x', '23').replace('y', '24').replace('m', '26'))

def parse_variant(variant):
    s = re.compile('-|_|:').split(variant)
    if len(s) != 4:
        raise ParseException()
    chr = parse_chr(s[0])
    try:
        pos = int(s[1])
    except ValueError:
        raise ParseException()
    return (chr, pos, s[2].upper(), s[3].upper())

def parse_region(region):
    s = re.compile('-|:').split(region)
    if len(s) != 3:
        raise ParseException()
    chr = parse_chr(s[0])
    try:
        start = int(s[1])
    except ValueError:
        raise ParseException()
    try:
        end = int(s[2])
    except ValueError:
        raise ParseException()
    return (chr, start, end)


def format_variant(variant):
    chr, pos, ref, alt = parse_variant(variant)
    if chr == 23:
        chrom = 'X'
    elif chr == 24:
        chrom = 'Y'
    elif chr == 26:
        chrom = 'M'
    else:
        chrom = chr
    return "%s:%s:%s:%s" % (chrom, pos, ref, alt)

def get_vcf_file(flist, chr):
    match = None
    pattern = 'chr' + str(chr)
    for i, f in enumerate(flist):
        matches = re.findall('chr[0-9]*', f)
        for m in matches:
            if m == pattern:
                match = flist[i]
                break
    return match